import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const revalidate = 900;

export async function GET() {
  const database = await db
    .execute(sql<boolean>`select true`)
    .then(() => true)
    .catch(() => false);
  const enka = await fetch("https://enka.network/api/uid/888888888/?info", {
    cache: "force-cache",
    headers: { "User-Agent": "Buzz Event Platform(Health Checker)" },
    signal: AbortSignal.timeout(5000),
  })
    .then((r) => r.ok)
    .catch(() => false);
  const amber = await fetch("https://gi.yatta.moe/api/v2/en/avatar", {
    cache: "force-cache",
    signal: AbortSignal.timeout(5000),
  })
    .then((r) => r.ok)
    .catch(() => false);
  return Response.json({ database, enka, amber });
}
