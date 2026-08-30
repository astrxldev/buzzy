type DebugRuntime = {
  bun: string;
  node: string;
  platform: string;
  arch: string;
  uptime: number;
};

type DebugHandlerDependencies = {
  adminCheck: () => Promise<unknown>;
  runtime: () => DebugRuntime;
  memoryUsage: () => NodeJS.MemoryUsage;
  probes: ReadonlyArray<{
    name: string;
    run: () => Promise<unknown>;
  }>;
  now?: () => number;
};

export function createDebugHandler({
  adminCheck,
  runtime,
  memoryUsage,
  probes,
  now = () => performance.now(),
}: DebugHandlerDependencies) {
  return async function getDebugStatus() {
    try {
      if (!(await adminCheck())) return unauthorized();
    } catch {
      return unauthorized();
    }

    const results = await Promise.all(
      probes.map(async ({ name, run }) => {
        const started = now();

        try {
          await run();
          return { name, ok: true, latencyMs: now() - started };
        } catch {
          return { name, ok: false, latencyMs: now() - started };
        }
      }),
    );

    return Response.json({
      timestamp: new Date().toISOString(),
      runtime: runtime(),
      memory: memoryUsage(),
      probes: results,
    });
  };
}

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}
