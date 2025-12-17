import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";

export const revalidate = 60;

export async function GET() {
  const red = await redis
    .ping()
    .then(() => true)
    .catch(() => false);
  const res = Object.fromEntries(
    await Promise.all(
      Object.entries(checks).map(
        async ([k, v]) =>
          [
            k,
            red
              ? (await redis.exists(`health:${k}`))
                ? (await redis.get(`health:${k}`)) === "ok"
                : await v().then(async (v) => {
                    if (v) await redis.setex(`health:${k}`, 900, "ok");
                    return v;
                  })
              : await v(),
          ] as const,
      ),
    ),
  );
  return Response.json({ red, ...res });
}

const checks = {
  async database() {
    return await db
      .execute(sql<boolean>`select true`)
      .then(() => true)
      .catch(() => false);
  },
  async enka() {
    return await fetch("https://enka.network/api/uid/888888888/?info", {
      headers: { "User-Agent": "Buzz, https://buzz.sudloh.com/api/health" },
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => r.ok)
      .catch(() => false);
  },
  async amber() {
    return await fetch("https://gi.yatta.moe/api/v2/en/avatar", {
      headers: { "User-Agent": "Buzz, https://buzz.sudloh.com/api/health" },
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => r.ok)
      .catch(() => false);
  },
} as const;
