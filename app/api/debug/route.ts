import { sql } from "drizzle-orm";
import { youtubeCache } from "@/lib/adaptive-cache";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";
import { createDebugHandler } from "./handler";

const timeoutMs = 5_000;

export const GET = createDebugHandler({
  adminCheck,
  runtime: () => ({
    bun: Bun.version,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
  }),
  memoryUsage: () => process.memoryUsage(),
  probes: [
    {
      name: "redis",
      run: () => withTimeout(redis!.ping(), timeoutMs),
    },
    {
      name: "postgres",
      run: () => withTimeout(db.execute(sql`SELECT 1`), timeoutMs),
    },
    {
      name: "youtubeCache",
      run: () => withTimeout(youtubeCache.debugStats(), timeoutMs),
    },
  ],
});

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Probe timed out")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timeout!);
  }
}
