// gpt'd at 3am, used as-is by another module

interface AdaptiveCacheOptions {
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

export class AdaptiveCache {
  private readonly cache = new Map<
    string,
    {
      expires: number;
      response: Response;
    }
  >();

  private readonly requests: number[] = [];

  constructor(private readonly options: AdaptiveCacheOptions) {
    options.lookback ??= options.period / 2;
    options.threshold ??= 0.5;
    options.key ??= (req) => req.url;
  }

  async fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    fetcher: typeof fetch = fetch,
  ): Promise<Response> {
    const req = input instanceof Request ? input : new Request(input, init);

    const now = Date.now();

    this.cleanup(now);

    const key = this.options.key!(req);

    if (this.shouldCache()) {
      const cached = this.cache.get(key);
      if (cached && cached.expires > now) return cached.response.clone();
    }

    const res = await fetcher(req);

    if (res.ok) {
      this.requests.push(now);

      this.cache.set(key, {
        expires: now + this.options.ttl,
        response: res.clone(),
      });
    }

    return res;
  }

  private shouldCache() {
    const projected =
      this.requests.length * (this.options.period / this.options.lookback!);

    return projected >= this.options.maxRequests * this.options.threshold!;
  }

  private cleanup(now: number) {
    const cutoff = now - this.options.lookback!;

    while (this.requests.length && this.requests[0] < cutoff)
      this.requests.shift();

    for (const [key, value] of this.cache)
      if (value.expires <= now) this.cache.delete(key);
  }
}

export const youtubeCache = new AdaptiveCache({
  maxRequests: 100, // YouTube search.list requests/day
  period: 24 * 60 * 60_000,
  ttl: 15 * 60_000,
});
