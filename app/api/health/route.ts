import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { redis as redisShared } from "@/lib/db/redis";
import { GoogleGenAI } from "@google/genai";
import { env } from "bun";
const { DISCORD_BOT_TOKEN, GEMINI_TTS_API_KEY } = env as Record<string, string>;

const redis = redisShared!;

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
                : await v().then(async (r: any) => {
                    const v = r instanceof Response ? r.ok : !!r;
                    if (v) await redis.setex(`health:${k}`, 900, "ok");
                    return v;
                  })
              : await v().then((r: any) =>
                  r instanceof Response ? r.ok : !!r,
                ),
          ] as const,
      ),
    ),
  );
  return Response.json(
    { red, ...res },
    { status: res.database && red ? 200 : 201 },
  );
}

const checks = {
  async database() {
    return await db
      .execute(sql<boolean>`select true`)
      .then(() => true)
      .catch(() => false);
  },
  async enka() {
    return fetch("https://enka.network/api/uid/888888888/?info", {
      headers: { "User-Agent": "Buzz, https://buzz.sudloh.com/api/health" },
      signal: AbortSignal.timeout(5000),
    });
  },
  async amber() {
    return fetch("https://gi.yatta.moe/api/v2/en/avatar", {
      headers: { "User-Agent": "Buzz, https://buzz.sudloh.com/api/health" },
      signal: AbortSignal.timeout(5000),
    });
  },
  async yt() {
    return fetch("https://buzz.sudloh.com/api/live", {
      signal: AbortSignal.timeout(5000),
    });
  },
  async card() {
    return fetch("https://api.astrxl.dev/v1/card/genshin/stats", {
      signal: AbortSignal.timeout(5000),
    });
  },
  async slip() {
    return fetch("https://api.slipok.com/", {
      signal: AbortSignal.timeout(5000),
    });
  },
  async tts() {
    const client = new GoogleGenAI({ apiKey: GEMINI_TTS_API_KEY });
    return client.models
      .list()
      .then(() => true)
      .catch(() => false);
  },
  async tmn() {
    return fetch("https://api.sastify.xyz/health", {
      signal: AbortSignal.timeout(5000),
    });
  },
  async discord() {
    return fetch("https://discord.com/api/v10/users/@me", {
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });
  },
} satisfies Record<string, () => Promise<Response | boolean>>;
