import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";
import { env } from "bun";
import { sql } from "drizzle-orm";

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

export async function GET(request: Request) {
  if (!await adminCheck()) {
    return new Response("Unauthorized", { status: 401 });
  }

  const probes = await Promise.all([
    probe("redis", async () => {
      const started = performance.now();
      const result = await redis?.ping();

      return {
        result,
        latencyMs: performance.now() - started,
      };
    }),

    probe("postgres", async () => {
      const started = performance.now();
      const result = await db.execute(sql`SELECT 1`);

      return {
        result,
        latencyMs: performance.now() - started,
      };
    }),
  ]);

  return Response.json({
    timestamp: new Date().toISOString(),

    runtime: {
      bun: Bun.version,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      cwd: process.cwd(),
    },

    memory: process.memoryUsage(),

    eventLoop: {
      now: performance.now(),
    },

    request: {
      url: request.url,
      headers: Object.fromEntries(request.headers),
    },

    env,

    probes,
  });
}
