import { describe, expect, mock, test } from "bun:test";
import { AdaptiveCache } from "./adaptive-cache";

class FakeRedis {
  readonly strings = new Map<string, { value: string; expires: number }>();
  readonly sortedSets = new Map<string, Map<string, number>>();
  readonly commands: { command: string; args: string[] }[] = [];

  async get(key: string) {
    const entry = this.strings.get(key);
    if (!entry || entry.expires <= Date.now()) {
      this.strings.delete(key);
      return null;
    }
    return entry.value;
  }

  async send(command: string, args: string[]): Promise<unknown> {
    this.commands.push({ command, args });

    if (command === "DEL") return this.strings.delete(args[0]) ? 1 : 0;
    if (command !== "EVAL") throw new Error(`Unsupported command: ${command}`);

    if (args[0].includes("return {")) {
      const requests = this.sortedSet(args[2]);
      const entries = this.sortedSet(args[3]);
      const cutoff = Number(args[4]);
      const now = Number(args[5]);

      for (const [member, score] of requests)
        if (score < cutoff) requests.delete(member);
      for (const [member, score] of entries)
        if (score <= now) entries.delete(member);

      return [requests.size, entries.size];
    }

    const responseKey = args[2];
    const requests = this.sortedSet(args[3]);
    const entries = this.sortedSet(args[4]);
    const startedAt = Number(args[5]);
    const requestMember = args[6];
    const cached = args[8];
    const remainingTtl = Number(args[9]);
    const expiresAt = Number(args[10]);
    const hash = args[11];

    requests.set(requestMember, startedAt);
    if (remainingTtl > 0) {
      this.strings.set(responseKey, {
        value: cached,
        expires: Date.now() + remainingTtl,
      });
      entries.set(hash, expiresAt);
    }
    return null;
  }

  private sortedSet(key: string) {
    let set = this.sortedSets.get(key);
    if (!set) {
      set = new Map();
      this.sortedSets.set(key, set);
    }
    return set;
  }
}

const options = {
  name: "test",
  maxRequests: 4,
  period: 1_000,
  lookback: 500,
  ttl: 1_000,
};

describe("AdaptiveCache", () => {
  test("shares quota and cached responses between instances", async () => {
    const redis = new FakeRedis();
    const firstReplica = new AdaptiveCache(options, redis);
    const restartedReplica = new AdaptiveCache(options, redis);
    const upstream = mock(
      async () =>
        new Response("first", {
          status: 201,
          statusText: "Created",
          headers: { "x-cache-test": "yes" },
        }),
    );
    const url = "https://example.com/data?secret=do-not-leak";

    await firstReplica.fetch(url, undefined, upstream);
    const response = await restartedReplica.fetch(url, undefined, upstream);

    expect(upstream).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(201);
    expect(response.statusText).toBe("Created");
    expect(response.headers.get("x-cache-test")).toBe("yes");
    expect(await response.text()).toBe("first");
    expect(redis.commands.flatMap(({ args }) => args).join(" ")).not.toContain(
      "do-not-leak",
    );
    expect(await restartedReplica.debugStats()).toContain(
      "HOT | recent=1 | projected=2.0/4",
    );
  });

  test("does not count or cache unsuccessful responses", async () => {
    const redis = new FakeRedis();
    const cache = new AdaptiveCache(options, redis);

    await cache.fetch(
      "https://example.com/failure",
      undefined,
      async () => new Response("failure", { status: 500 }),
    );

    expect(await cache.debugStats()).toContain("recent=0");
    expect(redis.strings.size).toBe(0);
  });

  test("fetches upstream without writing when Redis is unavailable", async () => {
    const unavailable = {
      get: async () => {
        throw new Error("offline");
      },
      send: mock(async () => {
        throw new Error("offline");
      }),
    };
    const cache = new AdaptiveCache(options, unavailable);
    const error = console.error;
    console.error = mock(() => {});

    try {
      const response = await cache.fetch(
        "https://example.com/data",
        undefined,
        async () => new Response("upstream"),
      );
      expect(await response.text()).toBe("upstream");
      expect(unavailable.send).toHaveBeenCalledTimes(1);
    } finally {
      console.error = error;
    }
  });

  test("expires response entries without losing request history", async () => {
    const redis = new FakeRedis();
    const cache = new AdaptiveCache({ ...options, ttl: 5 }, redis);
    let calls = 0;
    const upstream = async () => new Response(`${++calls}`);

    await cache.fetch("https://example.com/data", undefined, upstream);
    await Bun.sleep(10);
    const response = await cache.fetch(
      "https://example.com/data",
      undefined,
      upstream,
    );

    expect(await response.text()).toBe("2");
    expect(calls).toBe(2);
    expect(await cache.debugStats()).toContain("recent=2");
  });
});
