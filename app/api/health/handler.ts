export type HealthCheck = () => Promise<Response | boolean>;

type HealthRedis = {
  ping(): Promise<unknown>;
  exists(key: string): Promise<number | boolean>;
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<unknown>;
};

const checkResult = async (check: HealthCheck) => {
  try {
    const result = await check();
    return result instanceof Response ? result.ok : !!result;
  } catch {
    return false;
  }
};

export function createHealthHandler({
  redis,
  checks,
}: {
  redis: HealthRedis;
  checks: Record<string, HealthCheck>;
}) {
  return async function GET() {
    const red = await redis
      .ping()
      .then(() => true)
      .catch(() => false);

    const entries = await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        const key = `health:${name}`;
        if (red) {
          try {
            if (await redis.exists(key))
              return [name, (await redis.get(key)) === "ok"] as const;
          } catch {}
        }

        const healthy = await checkResult(check);
        if (red && healthy) {
          try {
            await redis.setex(key, 900, "ok");
          } catch {}
        }
        return [name, healthy] as const;
      }),
    );
    const results = Object.fromEntries(entries) as Record<string, boolean>;
    return Response.json(
      { red, ...results },
      { status: red && results.database ? 200 : 503 },
    );
  };
}
