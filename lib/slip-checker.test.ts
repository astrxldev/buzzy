import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  getSlipConfiguration,
  isSlipProvider,
  type SlipProvider,
  verifySlip,
} from "./slip-checker";

const env = {
  SLIPOK_API_URL: "https://slipok.example/verify",
  SLIPOK_API_KEY: "slipok-test-key",
  SLIP2GO_VERIFY_URL: "https://slip2go.example/api/verify-slip/qr-image/info",
  SLIP2GO_API_SECRET: "slip2go-test-key",
  PROMPTPAY_TYPE: "mobile",
  PROMPTPAY_IDENTIFIER: "+66-81-234-5678",
};
const buffer = Buffer.from("test slip image");
const transaction = { transRef: "BANK-REF-1", amount: 12.5 };
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
afterEach(() => fetchSpy?.mockRestore());

function respond(raw: unknown, status = 200) {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json(raw, { status }),
  );
}

describe("slip provider configuration", () => {
  test("allows only the two supported providers", () => {
    expect(isSlipProvider("slipok")).toBe(true);
    expect(isSlipProvider("slip2go")).toBe(true);
    expect(isSlipProvider("other")).toBe(false);
  });

  test.each([
    ["mobile", "+66-81-234-5678", "02001", "0812345678"],
    ["mobile", "0066812345678", "02001", "0812345678"],
    ["nationalId", "1-2345-67890-12-3", "02003", "1234567890123"],
    ["ewallet", "012 345 678 901 234", "02004", "012345678901234"],
  ])("normalizes %s %s", (type, value, accountType, accountNumber) => {
    expect(
      getSlipConfiguration("slip2go", {
        ...env,
        PROMPTPAY_TYPE: type,
        PROMPTPAY_IDENTIFIER: value,
      }).receiver,
    ).toEqual({ accountType, accountNumber });
  });

  test.each([
    { SLIP2GO_API_SECRET: undefined },
    { SLIP2GO_VERIFY_URL: undefined },
    { SLIP2GO_VERIFY_URL: "invalid" },
    { SLIP2GO_VERIFY_URL: "file:///tmp/slip" },
    { PROMPTPAY_TYPE: "bankAccount" },
    { PROMPTPAY_IDENTIFIER: undefined },
    { PROMPTPAY_IDENTIFIER: "0812abc" },
  ])("rejects invalid Slip2Go configuration %p", (override) => {
    expect(() =>
      getSlipConfiguration("slip2go", { ...env, ...override }),
    ).toThrow();
  });

  test("SlipOK does not require PromptPay configuration", () => {
    expect(
      getSlipConfiguration("slipok", {
        SLIPOK_API_URL: env.SLIPOK_API_URL,
        SLIPOK_API_KEY: env.SLIPOK_API_KEY,
      }).receiver,
    ).toBeUndefined();
  });
});

describe("slip verification requests", () => {
  test("preserves SlipOK upload format and retains the full response", async () => {
    const raw = {
      success: true,
      data: { ...transaction, sender: { name: "Sender" } },
    };
    respond(raw);
    expect(await verifySlip("slipok", buffer, "image/png", 12.5, env)).toEqual({
      success: true,
      provider: "slipok",
      data: transaction,
      raw,
    });
    const [url, init] = fetchSpy!.mock.calls[0];
    expect(url).toBe(env.SLIPOK_API_URL);
    expect(init!.headers).toEqual({ "x-authorization": env.SLIPOK_API_KEY });
    expect(init!.method).toBe("POST");
    const form = init!.body as FormData;
    expect(Array.from(form.keys())).toEqual(["files", "amount"]);
    expect(form.get("amount")).toBe("12.5");
    const file = form.get("files") as File;
    expect(file.type).toBe("image/png");
    expect(await file.text()).toBe("test slip image");
    expect(init!.signal).toBeInstanceOf(AbortSignal);
  });

  test.each([
    "200000",
    "200200",
  ])("Slip2Go success %s checks receiver and amount", async (code) => {
    const raw = { code, message: "Slip found.", data: transaction };
    respond(raw);
    expect(
      await verifySlip("slip2go", buffer, "image/jpeg", 12.5, env),
    ).toEqual({ success: true, provider: "slip2go", data: transaction, raw });
    const [url, init] = fetchSpy!.mock.calls[0];
    expect(url).toBe(env.SLIP2GO_VERIFY_URL);
    expect(init!.headers).toEqual({ Authorization: env.SLIP2GO_API_SECRET });
    const form = init!.body as FormData;
    expect(Array.from(form.keys())).toEqual(["file", "payload"]);
    expect((form.get("file") as File).type).toBe("image/jpeg");
    expect(JSON.parse(form.get("payload") as string)).toEqual({
      checkAmount: { type: "eq", amount: "12.5" },
      checkReceiver: [{ accountType: "02001", accountNumber: "0812345678" }],
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("failed verification", () => {
  test.each([
    "200401",
    "200402",
    "200403",
    "200404",
    "200500",
    "200501",
    "200502",
    "200202",
    "200001",
    "unexpected",
  ])("rejects Slip2Go code %s even with HTTP 200 and transaction data", async (code) => {
    const raw = { code, message: "Rejected", data: transaction };
    respond(raw);
    expect(
      await verifySlip("slip2go", buffer, "image/png", 12.5, env),
    ).toMatchObject({ success: false, code, message: "Rejected", raw });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("preserves SlipOK failure code and message", async () => {
    respond({ success: false, code: 1010, message: "Invalid slip" });
    expect(
      await verifySlip("slipok", buffer, "image/png", 12.5, env),
    ).toMatchObject({ success: false, code: 1010, message: "Invalid slip" });
  });

  for (const provider of ["slipok", "slip2go"] satisfies SlipProvider[]) {
    const success =
      provider === "slipok" ? { success: true } : { code: "200200" };
    test.each([
      {},
      { transRef: "", amount: 12.5 },
      { transRef: "REF" },
      { transRef: "REF", amount: "12.5" },
      { transRef: "REF", amount: 0 },
    ])(`${provider} rejects incomplete transaction %p`, async (data) => {
      respond({ ...success, data });
      expect(
        await verifySlip(provider, buffer, "image/png", 12.5, env),
      ).toMatchObject({ success: false, code: "INVALID_RESPONSE" });
    });

    test(`${provider} rejects amount mismatches`, async () => {
      respond({ ...success, data: { ...transaction, amount: 10 } });
      expect(
        await verifySlip(provider, buffer, "image/png", 12.5, env),
      ).toMatchObject({ success: false, code: "AMOUNT_MISMATCH" });
    });

    test(`${provider} rejects HTTP errors despite a success body`, async () => {
      respond({ ...success, data: transaction }, 500);
      expect(
        (await verifySlip(provider, buffer, "image/png", 12.5, env)).success,
      ).toBe(false);
    });
  }

  test.each([
    [null],
    [[]],
    ["invalid"],
  ])("rejects malformed envelopes %p", async (raw) => {
    respond(raw);
    expect(
      await verifySlip("slip2go", buffer, "image/png", 12.5, env),
    ).toMatchObject({ success: false, code: "INVALID_RESPONSE" });
  });

  test("rejects non-JSON responses", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>error</html>"),
    );
    expect(
      await verifySlip("slip2go", buffer, "image/png", 12.5, env),
    ).toMatchObject({ success: false, code: "INVALID_RESPONSE" });
  });

  test.each([
    401, 429, 503,
  ])("preserves provider failure on HTTP %s", async (status) => {
    respond({ code: "401005", message: "Insufficient Token" }, status);
    expect(
      await verifySlip("slip2go", buffer, "image/png", 12.5, env),
    ).toMatchObject({
      success: false,
      code: "401005",
      message: "Insufficient Token",
    });
  });

  test.each([
    "TimeoutError",
    "AbortError",
    "TypeError",
  ])("handles %s without retry", async (name) => {
    fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException("Failed", name),
    );
    expect(
      await verifySlip("slip2go", buffer, "image/png", 12.5, env),
    ).toMatchObject({
      success: false,
      code: name === "TypeError" ? "NETWORK_ERROR" : "TIMEOUT",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("missing configuration never contacts a provider", async () => {
    respond({});
    expect(
      await verifySlip("slip2go", buffer, "image/png", 12.5, {}),
    ).toMatchObject({ success: false, code: "CONFIGURATION_ERROR" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
