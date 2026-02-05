import { redis } from "bun";
import type { EnkaNetworkUser } from "@/types/enka";

export const revalidate = 300; // 5 minutes

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  const cached = await redis.get(`enka:${uid}`);
  if (cached) return Response.json(JSON.parse(cached));

  const res = await fetch(`https://enka.network/api/uid/${uid}?info`, {
    headers: { "User-Agent": "Buzz Event Platform" },
  }).then(
    (e) =>
      e.json() as Promise<
        | (EnkaNetworkUser & { message: undefined })
        | { message: string; playerInfo: undefined }
      >,
  );
  if (!res.playerInfo) return Response.json(res);
  if (res.ttl) {
    const ttl = res.ttl - 2;
    await redis.setex(
      `enka:${uid}`,
      // sometimes it goes crazy
      Number.isNaN(ttl) || ttl < 0 || ttl > 1000 ? 60 : ttl,
      JSON.stringify(res),
    );
  }
  return Response.json(res);
}
