import { redis } from "@/lib/db/redis";

interface AdaptiveCacheOptions {
  /** Stable namespace shared by every replica. */
  name: string;

  /** Maximum requests allowed per period. */
  maxRequests: number;

  /** Usually one day. */
  period: number;

  /** Rolling window used to estimate request rate. Defaults to period / 2. */
  lookback?: number;

  /** Enable caching once projected usage exceeds this fraction. Defaults to 0.5. */
  threshold?: number;

  /** How long cached entries live. */
  ttl: number;

  /** Cache key generator. */
  key?(req: Request): string;
}

type RedisClient = {
  get(key: string): Promise<string | null>;
  send(command: string, args: string[]): Promise<unknown>;
};

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type CachedResponse = {
  version: 1;
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
};

const STATS_SCRIPT = `
redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", "(" .. ARGV[1])
redis.call("ZREMRANGEBYSCORE", KEYS[2], "-inf", ARGV[2])
return { redis.call("ZCARD", KEYS[1]), redis.call("ZCARD", KEYS[2]) }
`;

const STORE_SCRIPT = `
redis.call("ZADD", KEYS[2], ARGV[1], ARGV[2])
redis.call("PEXPIRE", KEYS[2], ARGV[3])

if tonumber(ARGV[5]) > 0 then
  redis.call("SET", KEYS[1], ARGV[4], "PX", ARGV[5])
  redis.call("ZADD", KEYS[3], ARGV[6], ARGV[7])
  redis.call("PEXPIRE", KEYS[3], ARGV[8])
end
`;

export class AdaptiveCache {
  private readonly lookback: number;
  private readonly threshold: number;
  private readonly key: (req: Request) => string;
  private readonly prefix: string;

  constructor(
    private readonly options: AdaptiveCacheOptions,
    private readonly client: RedisClient | null = redis,
  ) {
    this.lookback = options.lookback ?? options.period / 2;
    this.threshold = options.threshold ?? 0.5;
    this.key = options.key ?? ((req) => req.url);
    this.prefix = `adaptive-cache:v1:${options.name}`;
  }

  async fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    fetcher: Fetcher = fetch,
  ): Promise<Response> {
    const req = input instanceof Request ? input : new Request(input, init);
    const startedAt = Date.now();

    if (!this.client) return fetcher(req);

    const hash = await this.hash(this.key(req));
    const responseKey = `${this.prefix}:response:${hash}`;

    try {
      const { requests } = await this.stats(startedAt);

      if (this.shouldCache(requests)) {
        const cached = await this.client.get(responseKey);
        if (cached) {
          try {
            return this.deserialize(cached);
          } catch (error) {
            console.error("Invalid AdaptiveCache response in Redis", error);
            await this.client.send("DEL", [responseKey]);
          }
        }
      }
    } catch (error) {
      console.error("AdaptiveCache Redis read failed", error);
      return fetcher(req);
    }

    const res = await fetcher(req);

    if (res.ok) {
      const expiresAt = startedAt + this.options.ttl;
      const remainingTtl = Math.max(0, expiresAt - Date.now());
      let cached = "";

      try {
        cached = await this.serialize(res.clone());
      } catch (error) {
        console.error("AdaptiveCache response serialization failed", error);
      }

      try {
        await this.client.send("EVAL", [
          STORE_SCRIPT,
          "3",
          responseKey,
          `${this.prefix}:requests`,
          `${this.prefix}:entries`,
          `${startedAt}`,
          `${startedAt}:${crypto.randomUUID()}`,
          `${this.lookback}`,
          cached,
          `${cached ? remainingTtl : 0}`,
          `${expiresAt}`,
          hash,
          `${this.options.ttl}`,
        ]);
      } catch (error) {
        console.error("AdaptiveCache Redis write failed", error);
      }
    }

    return res;
  }

  async debugStats() {
    if (!this.client)
      throw new Error("Redis is not available in this environment.");

    const { requests, entries } = await this.stats(Date.now());
    const projected = requests * (this.options.period / this.lookback);

    return [
      `AdaptiveCache`,
      this.shouldCache(requests) ? "HOT" : "COLD",
      `recent=${requests}`,
      `projected=${projected.toFixed(1)}/${this.options.maxRequests}`,
      `usage=${((projected / this.options.maxRequests) * 100).toFixed(0)}%`,
      `entries=${entries}`,
    ].join(" | ");
  }

  private shouldCache(requests: number) {
    const projected = requests * (this.options.period / this.lookback);
    return projected >= this.options.maxRequests * this.threshold;
  }

  private async stats(now: number) {
    const result = await this.client!.send("EVAL", [
      STATS_SCRIPT,
      "2",
      `${this.prefix}:requests`,
      `${this.prefix}:entries`,
      `${now - this.lookback}`,
      `${now}`,
    ]);

    if (!Array.isArray(result) || result.length !== 2)
      throw new Error("Unexpected AdaptiveCache stats response from Redis.");

    return { requests: Number(result[0]), entries: Number(result[1]) };
  }

  private async hash(value: string) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }

  private async serialize(response: Response) {
    const cached: CachedResponse = {
      version: 1,
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries()),
      body: Buffer.from(await response.arrayBuffer()).toString("base64"),
    };
    return JSON.stringify(cached);
  }

  private deserialize(value: string) {
    const cached = JSON.parse(value) as CachedResponse;
    if (cached.version !== 1) throw new Error("Unsupported cache version.");

    return new Response(Buffer.from(cached.body, "base64"), {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
    });
  }
}

export const youtubeCache = new AdaptiveCache({
  name: "youtube",
  maxRequests: 100, // YouTube search.list requests/day
  period: 24 * 60 * 60_000,
  ttl: 15 * 60_000,
});
