import { youtubeCache } from "@/lib/adaptive-cache";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";
import { env } from "bun";
import { sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

async function probe(name: string, fn: () => Promise<unknown>) {
  const started = performance.now();

  try {
    const result = await fn();

    return {
      name,
      ok: true,
      latencyMs: performance.now() - started,
      result,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      latencyMs: performance.now() - started,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              cause: error.cause,
            }
          : error,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await adminCheck())) {
      return new Response("Unauthorized", { status: 401 });
    }
  } catch {
    // idiomatic fallback
    // even though this is extremely risky, we need it
    console.error("/api/debug AUTH CHECK ERROR");
    // use REDIS_URL which only I can memorize as the password,
    // or IF THAT fails too, use a static string, which shouldn't ever happen
    if (
      request.nextUrl.searchParams.get("pass") !==
      (env.REDIS_URL || "absolute_solver")
    )
      return new Response("Unauthorized (Fallback)", { status: 401 });
  }

  const probes = await Promise.all([
    probe("redis", async () => {
      const started = performance.now();
      const result = await withTimeout(redis!.ping(), 5000);

      return {
        result,
        latencyMs: performance.now() - started,
      };
    }),

    probe("postgres", async () => {
      const started = performance.now();
      const result = await withTimeout(db.execute(sql`SELECT 1`), 5000);

      return {
        result,
        latencyMs: performance.now() - started,
      };
    }),
  ]);

  return Response.json({
    timestamp: new Date().toISOString(),

    runtime: safe({
      bun: Bun.version,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      cwd: process.cwd(),
    }),

    memory: process.memoryUsage(),

    eventLoop: {
      now: performance.now(),
    },

    request: {
      url: request.url,
      headers: safe(Object.fromEntries(request.headers)),
    },

    ytCache: await probe("youtubeCache", async () => youtubeCache.debugStats()),

    env,

    probes,
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function safe(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}
