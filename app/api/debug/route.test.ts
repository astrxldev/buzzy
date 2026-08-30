import { describe, expect, mock, test } from "bun:test";
import { createDebugHandler } from "./handler";

const runtime = () => ({
  bun: "1.0.0",
  node: "v20.0.0",
  platform: "linux",
  arch: "x64",
  uptime: 10,
});

const memoryUsage = () => ({
  rss: 1,
  heapTotal: 2,
  heapUsed: 3,
  external: 4,
  arrayBuffers: 5,
});

describe("debug route handler", () => {
  test("rejects non-admin requests without running probes", async () => {
    const run = mock(async () => "PONG");
    const handler = createDebugHandler({
      adminCheck: mock(async () => null),
      runtime,
      memoryUsage,
      probes: [{ name: "redis", run }],
    });

    const response = await handler();

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(run).not.toHaveBeenCalled();
  });

  test("fails closed when admin authentication throws", async () => {
    const run = mock(async () => "PONG");
    const handler = createDebugHandler({
      adminCheck: mock(async () => {
        throw new Error("session database unavailable");
      }),
      runtime,
      memoryUsage,
      probes: [{ name: "redis", run }],
    });

    const response = await handler();

    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  test("returns bounded diagnostics to an admin", async () => {
    let time = 10;
    const handler = createDebugHandler({
      adminCheck: mock(async () => ({ role: "admin" })),
      runtime,
      memoryUsage,
      probes: [
        { name: "redis", run: mock(async () => "PONG") },
        {
          name: "postgres",
          run: mock(async () => {
            throw new Error("password=secret\nstack trace");
          }),
        },
      ],
      now: () => time++,
    });

    const response = await handler();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      runtime: runtime(),
      memory: memoryUsage(),
      probes: [
        { name: "redis", ok: true },
        { name: "postgres", ok: false },
      ],
    });
    expect(
      body.probes.every(
        ({ latencyMs }: { latencyMs: number }) => latencyMs >= 0,
      ),
    ).toBeTrue();
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("stack");
    expect(serialized).not.toContain("cookie");
    expect(serialized).not.toContain("authorization");
    expect(body).not.toHaveProperty("env");
    expect(body).not.toHaveProperty("request");
  });

  test("uses the runtime performance clock by default", async () => {
    const handler = createDebugHandler({
      adminCheck: mock(async () => ({ role: "admin" })),
      runtime,
      memoryUsage,
      probes: [{ name: "redis", run: mock(async () => "PONG") }],
    });

    const body = await (await handler()).json();
    expect(body.probes[0].latencyMs).toBeGreaterThanOrEqual(0);
  });
});
