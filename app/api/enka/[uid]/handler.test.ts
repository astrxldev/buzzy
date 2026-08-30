import { describe, expect, mock, test } from "bun:test";
import { createEnkaHandler } from "./handler";

const context = (uid = "800000001") => ({ params: Promise.resolve({ uid }) });
const request = new Request("https://example.com/api/enka/800000001");
const player = { playerInfo: { nickname: "Traveler" }, ttl: 300 };

function dependencies(cached: string | null = null, result: unknown = player) {
  const redis = {
    get: mock(() => Promise.resolve(cached)),
    setex: mock(() => Promise.resolve("OK")),
  };
  const fetch = mock(() => Promise.resolve(Response.json(result)));
  return { redis, fetch };
}

describe("Enka handler", () => {
  test("returns cached JSON without contacting Enka", async () => {
    const deps = dependencies(
      JSON.stringify({ playerInfo: { nickname: "Cached" } }),
    );
    const response = await createEnkaHandler(deps)(request, context());
    expect(await response.json()).toEqual({
      playerInfo: { nickname: "Cached" },
    });
    expect(deps.redis.get).toHaveBeenCalledWith("enka:800000001");
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  test("fetches an encoded UID with the required user agent", async () => {
    const deps = dependencies();
    await createEnkaHandler(deps)(request, context("12/34"));
    expect(deps.fetch).toHaveBeenCalledWith(
      "https://enka.network/api/uid/12%2F34?info",
      { headers: { "User-Agent": "Buzz Event Platform" } },
    );
  });

  test("caches successful player data using ttl minus two", async () => {
    const deps = dependencies();
    const response = await createEnkaHandler(deps)(request, context());
    expect(await response.json()).toEqual(player);
    expect(deps.redis.setex).toHaveBeenCalledWith(
      "enka:800000001",
      298,
      JSON.stringify(player),
    );
  });

  test.each([
    1, 1003,
  ])("uses a safe fallback for invalid ttl %p", async (ttl) => {
    const result = { ...player, ttl };
    const deps = dependencies(null, result);
    await createEnkaHandler(deps)(request, context());
    expect(deps.redis.setex).toHaveBeenCalledWith(
      "enka:800000001",
      60,
      JSON.stringify(result),
    );
  });

  test("does not cache a non-numeric ttl", async () => {
    const deps = dependencies(null, { ...player, ttl: Number.NaN });
    await createEnkaHandler(deps)(request, context());
    expect(deps.redis.setex).not.toHaveBeenCalled();
  });

  test("does not cache a response without player info", async () => {
    const result = { message: "Player not found" };
    const deps = dependencies(null, result);
    expect(
      await (await createEnkaHandler(deps)(request, context())).json(),
    ).toEqual(result);
    expect(deps.redis.setex).not.toHaveBeenCalled();
  });

  test("does not cache successful data without a ttl", async () => {
    const result = { playerInfo: { nickname: "Traveler" } };
    const deps = dependencies(null, result);
    await createEnkaHandler(deps)(request, context());
    expect(deps.redis.setex).not.toHaveBeenCalled();
  });
});
