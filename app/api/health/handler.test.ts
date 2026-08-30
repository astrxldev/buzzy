import { describe, expect, mock, test } from "bun:test";
import { createHealthHandler, type HealthCheck } from "./handler";

function redisMock() {
  return {
    ping: mock(() => Promise.resolve("PONG")),
    exists: mock(() => Promise.resolve(0)),
    get: mock((): Promise<string | null> => Promise.resolve(null)),
    setex: mock(() => Promise.resolve("OK")),
  };
}

describe("health handler", () => {
  test("returns 200 and caches successful checks", async () => {
    const redis = redisMock();
    const checks = {
      database: mock(() => Promise.resolve(true)),
      upstream: mock(() =>
        Promise.resolve(new Response(null, { status: 204 })),
      ),
    };
    const response = await createHealthHandler({ redis, checks })();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      red: true,
      database: true,
      upstream: true,
    });
    expect(redis.setex).toHaveBeenCalledTimes(2);
    expect(redis.setex).toHaveBeenCalledWith("health:database", 900, "ok");
  });

  test("uses cached health without running a dependency", async () => {
    const redis = redisMock();
    redis.exists.mockResolvedValue(1);
    redis.get.mockResolvedValue("ok");
    const database = mock(() => Promise.resolve(false));
    const response = await createHealthHandler({
      redis,
      checks: { database },
    })();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ red: true, database: true });
    expect(database).not.toHaveBeenCalled();
  });

  test("treats a non-ok cached value as false", async () => {
    const redis = redisMock();
    redis.exists.mockResolvedValue(1);
    redis.get.mockResolvedValue("failed");
    const response = await createHealthHandler({
      redis,
      checks: { database: mock(() => Promise.resolve(true)) },
    })();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ red: true, database: false });
  });

  test("converts rejected checks to false without rejecting the request", async () => {
    const checks: Record<string, HealthCheck> = {
      database: () => Promise.resolve(true),
      rejected: () => Promise.reject(new Error("offline")),
      badResponse: () => Promise.resolve(new Response(null, { status: 500 })),
      falseValue: () => Promise.resolve(false),
    };
    const response = await createHealthHandler({
      redis: redisMock(),
      checks,
    })();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      red: true,
      database: true,
      rejected: false,
      badResponse: false,
      falseValue: false,
    });
  });

  test("returns 503 when Redis is unavailable and still executes checks", async () => {
    const redis = redisMock();
    redis.ping.mockRejectedValue(new Error("offline"));
    const database = mock(() => Promise.resolve(true));
    const response = await createHealthHandler({
      redis,
      checks: { database },
    })();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ red: false, database: true });
    expect(database).toHaveBeenCalled();
    expect(redis.exists).not.toHaveBeenCalled();
    expect(redis.setex).not.toHaveBeenCalled();
  });

  test("returns 503 when the database is unhealthy", async () => {
    const response = await createHealthHandler({
      redis: redisMock(),
      checks: { database: () => Promise.resolve(false) },
    })();
    expect(response.status).toBe(503);
  });

  test("falls back to a live check when reading the cache rejects", async () => {
    const redis = redisMock();
    redis.exists.mockRejectedValue(new Error("cache failed"));
    const database = mock(() => Promise.resolve(true));
    const response = await createHealthHandler({
      redis,
      checks: { database },
    })();
    expect(response.status).toBe(200);
    expect(database).toHaveBeenCalled();
  });

  test("a cache write rejection does not change a healthy result", async () => {
    const redis = redisMock();
    redis.setex.mockRejectedValue(new Error("readonly"));
    const response = await createHealthHandler({
      redis,
      checks: { database: () => Promise.resolve(true) },
    })();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ red: true, database: true });
  });
});
