import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

// Keep these module mocks in this focused test process: no external DB/auth/services.
let storedProvider: string | undefined;
let authorized = true;
const saved = mock((values: { slipCheckProvider: string }) => {
  storedProvider = values.slipCheckProvider;
});
const primarySelect = mock(() => ({
  from: () => ({
    where: async () =>
      storedProvider === undefined ? [] : [{ provider: storedProvider }],
    limit: async () =>
      storedProvider === undefined
        ? []
        : [{ slipCheckProvider: storedProvider }],
  }),
}));
const replicaSelect = mock(() => {
  throw new Error("Provider must not be read from replica");
});
mock.module("@/lib/db", () => ({
  db: { select: replicaSelect },
  primaryDb: {
    select: primarySelect,
    insert: () => ({
      values: (values: { slipCheckProvider: string }) => ({
        onConflictDoUpdate: async () => saved(values),
      }),
    }),
  },
}));
mock.module("@/lib/auth", () => ({ adminCheck: async () => authorized }));
const actionLog = mock(async () => {});
mock.module("@/lib/api", () => ({ actionLog }));
const revalidatePath = mock(() => {});
mock.module("next/cache", () => ({ revalidatePath }));
mock.module("@/lib/db/sse-endpoints", () => ({ sse: {} }));
mock.module("@/util/sync", () => ({ syncAmber: async () => {} }));
const healthCache = new Map<string, string>();
mock.module("@/lib/db/redis", () => ({
  redis: {
    ping: async () => "PONG",
    exists: async (key: string) => Number(healthCache.has(key)),
    get: async (key: string) => healthCache.get(key),
    setex: async (key: string, _seconds: number, value: string) =>
      healthCache.set(key, value),
  },
}));

const { checkSlip, getSlipProvider } = await import("./payment");
const { getSettongs, setSlipCheckProvider } = await import(
  "@/app/(ui)/admin/settings/api"
);
const { GET: getHealth } = await import("@/app/api/health/route");
const testEnv = {
  SLIPOK_API_URL: "https://slipok.example/verify",
  SLIPOK_API_KEY: "test-slipok-key",
  SLIP2GO_VERIFY_URL: "https://slip2go.example/api/verify-slip/qr-image/info",
  SLIP2GO_API_SECRET: "test-slip2go-key",
  PROMPTPAY_TYPE: "mobile",
  PROMPTPAY_IDENTIFIER: "0812345678",
};
const previousEnv = Object.fromEntries(
  Object.keys(testEnv).map((key) => [key, process.env[key]]),
);
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
beforeEach(() => {
  Object.assign(process.env, testEnv);
  storedProvider = undefined;
  authorized = true;
  saved.mockClear();
  actionLog.mockClear();
  revalidatePath.mockClear();
  primarySelect.mockClear();
  replicaSelect.mockClear();
  healthCache.clear();
});
afterEach(() => {
  fetchSpy?.mockRestore();
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("saved slip provider", () => {
  test("defaults to SlipOK without a settings row", async () => {
    expect(await getSlipProvider()).toBe("slipok");
    expect((await getSettongs()).slipCheckProvider).toBe("slipok");
    expect(replicaSelect).not.toHaveBeenCalled();
  });

  test("only admins can change or read admin settings", async () => {
    authorized = false;
    await expect(setSlipCheckProvider("slip2go")).rejects.toBe("Unauthorized");
    await expect(getSettongs()).rejects.toBe("Unauthorized");
    expect(saved).not.toHaveBeenCalled();
  });

  test("rejects unsupported providers before saving", async () => {
    expect((await setSlipCheckProvider("unknown")).success).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  });

  test("does not save a provider with missing credentials", async () => {
    storedProvider = "slipok";
    delete process.env.SLIP2GO_API_SECRET;
    expect((await setSlipCheckProvider("slip2go")).success).toBe(false);
    expect(await getSlipProvider()).toBe("slipok");
    expect(saved).not.toHaveBeenCalled();
  });

  test("requires a valid recipient before switching to Slip2Go", async () => {
    delete process.env.PROMPTPAY_IDENTIFIER;
    expect((await setSlipCheckProvider("slip2go")).success).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  });

  test("saves, audits, refreshes, and takes effect on the next check", async () => {
    const transaction = { transRef: "SAME-BANK-REF", amount: 10 };
    fetchSpy = spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({ success: true, data: transaction }),
      )
      .mockResolvedValueOnce(
        Response.json({ code: "200200", data: transaction }),
      )
      .mockResolvedValueOnce(
        Response.json({ success: true, data: transaction }),
      );
    const buffer = Buffer.from("slip");
    const first = await checkSlip(buffer, "image/png", 10);
    expect(first.provider).toBe("slipok");
    expect(await setSlipCheckProvider("slip2go")).toEqual({
      success: true,
      provider: "slip2go",
    });
    expect((await getSettongs()).slipCheckProvider).toBe("slip2go");
    expect(actionLog).toHaveBeenCalledWith(
      "Changed slip verification provider",
      { provider: "slip2go" },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings");
    const second = await checkSlip(buffer, "image/png", 10);
    expect(second.provider).toBe("slip2go");
    if (!first.success || !second.success)
      throw new Error("Expected verified transactions");
    // Both providers keep the same bank reference for the existing unique DB constraint.
    expect(first.data.transRef).toBe(second.data.transRef);
    await setSlipCheckProvider("slipok");
    expect((await checkSlip(buffer, "image/png", 10)).provider).toBe("slipok");
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
      testEnv.SLIPOK_API_URL,
      testEnv.SLIP2GO_VERIFY_URL,
      testEnv.SLIPOK_API_URL,
    ]);
    expect(replicaSelect).not.toHaveBeenCalled();
  });

  test("an in-progress check keeps its starting provider", async () => {
    let complete!: (response: Response) => void;
    const request = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    fetchSpy = spyOn(globalThis, "fetch").mockReturnValue(request);
    const pending = checkSlip(Buffer.from("slip"), "image/png", 10);
    // Wait until the first request is sent, then change the setting.
    await Bun.sleep(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await setSlipCheckProvider("slip2go");
    complete(
      Response.json({ success: true, data: { transRef: "REF", amount: 10 } }),
    );
    expect((await pending).provider).toBe("slipok");
    expect(await getSlipProvider()).toBe("slip2go");
  });
});

describe("selected provider health", () => {
  test("checks origins without uploading slips and keeps caches separate", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    expect((await (await getHealth()).json()).slip).toBe(true);
    expect(healthCache.get("health:slip:slipok")).toBe("ok");
    await setSlipCheckProvider("slip2go");
    fetchSpy.mockResolvedValue(new Response(null, { status: 503 }));
    expect((await (await getHealth()).json()).slip).toBe(false);
    expect(healthCache.has("health:slip:slip2go")).toBe(false);
    const providerCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes("slip"),
    );
    expect(providerCalls.map(([url]) => String(url))).toEqual([
      "https://slipok.example",
      "https://slip2go.example",
    ]);
    for (const [, init] of providerCalls) {
      expect(init?.method).toBeUndefined();
      expect(init?.body).toBeUndefined();
      expect(init?.headers).toBeUndefined();
    }
  });

  test("an API origin returning 404 is reachable", async () => {
    storedProvider = "slip2go";
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 404 }),
    );
    expect((await (await getHealth()).json()).slip).toBe(true);
    expect(healthCache.get("health:slip:slip2go")).toBe("ok");
  });
});
