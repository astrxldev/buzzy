import { GoogleGenAI } from "@google/genai";
import { env } from "bun";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { redis as redisShared } from "@/lib/db/redis";
import { getSlipProvider } from "@/lib/payment";
import { getSlipConfiguration } from "@/lib/slip-checker";

const { DISCORD_BOT_TOKEN, GEMINI_TTS_API_KEY } = env as Record<string, string>;

const redis = redisShared!;

export const dynamic = "force-dynamic";

export async function GET() {
  const slipProvider = await getSlipProvider().catch(() => null);
  const healthChecks = {
    ...checks,
    async slip() {
      if (!slipProvider) return false;
      const { url } = getSlipConfiguration(slipProvider);
      // API origins may return 404/401 without a route or credentials; they are reachable.
      return fetch(new URL(url).origin, {
        signal: AbortSignal.timeout(5000),
      }).then((response) => response.status < 500);
    },
  };
  const red = await redis
    .ping()
    .then(() => true)
    .catch(() => false);
  const res = Object.fromEntries(
    await Promise.all(
      Object.entries(healthChecks).map(async ([k, v]) => {
        const cacheKey = `health:${k === "slip" ? `slip:${slipProvider}` : k}`;
        return [
          k,
          red
            ? (await redis.exists(cacheKey))
              ? (await redis.get(cacheKey)) === "ok"
              : await v()
                  .then(async (r) => {
                    const v = r instanceof Response ? r.ok : !!r;
                    if (v) await redis.setex(cacheKey, 900, "ok");
                    return v;
                  })
                  .catch(() => false)
            : await v()
                .then((r) => (r instanceof Response ? r.ok : !!r))
                .catch(() => false),
        ] as const;
      }),
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
    return fetch("https://buzz.sudloh.com/api/live?last=true", {
      signal: AbortSignal.timeout(5000),
    });
  },
  async card() {
    return fetch("https://api.astrxl.dev/v1/card/genshin/stats", {
      signal: AbortSignal.timeout(5000),
    });
  },
  async tts() {
    const client = new GoogleGenAI({
      apiKey: GEMINI_TTS_API_KEY.split(",").pop(),
    });
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
