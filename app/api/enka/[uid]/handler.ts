import type { EnkaNetworkUser } from "@/types/enka";

type EnkaResponse =
  | (EnkaNetworkUser & { message: undefined })
  | { message: string; playerInfo: undefined };

type EnkaRedis = {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<unknown>;
};

export function createEnkaHandler({
  redis,
  fetch,
}: {
  redis: EnkaRedis;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}) {
  return async function GET(
    _request: Request,
    { params }: { params: Promise<{ uid: string }> },
  ) {
    const { uid } = await params;
    const cacheKey = `enka:${uid}`;
    const cached = await redis.get(cacheKey);
    if (cached) return Response.json(JSON.parse(cached));

    const response = await fetch(
      `https://enka.network/api/uid/${encodeURIComponent(uid)}?info`,
      { headers: { "User-Agent": "Buzz Event Platform" } },
    );
    const result = (await response.json()) as EnkaResponse;
    if (!result.playerInfo) return Response.json(result);

    if (result.ttl) {
      const ttl = result.ttl - 2;
      await redis.setex(
        cacheKey,
        Number.isNaN(ttl) || ttl < 0 || ttl > 1000 ? 60 : ttl,
        JSON.stringify(result),
      );
    }
    return Response.json(result);
  };
}
