import { describe, expect, mock, test } from "bun:test";
import {
  createPromptPayQrGenerator,
  type DonationDependencies,
  parseDonationForm,
  processDonation,
  requireWidgetCredential,
} from "./service";

function promptPayInput(overrides: Record<string, string | Blob> = {}) {
  const form = new FormData();
  form.set("name", "Buzz");
  form.set("message", "hello");
  form.set("amount", "20");
  form.set("type", "pp");
  form.set("artifact", "false");
  form.set("slip", new File(["slip"], "slip.png", { type: "image/png" }));
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  const parsed = parseDonationForm(form);
  if (!parsed.success) throw new Error("invalid fixture");
  return parsed.data;
}

function trueMoneyInput(overrides: Record<string, string | Blob> = {}) {
  const form = new FormData();
  form.set("name", "Buzz");
  form.set("message", "hello");
  form.set("amount", "5");
  form.set("type", "tmn");
  form.set("artifact", "false");
  form.set("link", "https://gift.truemoney.com/campaign/?v=abc");
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  const parsed = parseDonationForm(form);
  if (!parsed.success) throw new Error("invalid fixture");
  return parsed.data;
}

function dependencies(): DonationDependencies {
  return {
    createId: mock(() => "trace-id"),
    checkPromptPay: mock(async () => ({
      success: true as const,
      data: { transRef: "ref-1" },
    })),
    savePromptPaySlip: mock(async () => true),
    redeemTrueMoney: mock(async () => ({
      success: true as const,
      data: { amount: 5, status: "SUCCESS" as const },
    })),
    downscaleImage: mock(async () => Buffer.from("small")),
    saveDonation: mock(async () => "donation-1"),
    promoteArtifact: mock(async () => {}),
    imageToDataUrl: mock(async () => "data:image/png;base64,c2xpcA=="),
    publishPopup: mock(() => {}),
    publishUpdate: mock(() => {}),
    capture: mock(() => {}),
  };
}

describe("donation validation", () => {
  test.each([
    ["non-numeric amount", { amount: "nope" }, "amount"],
    ["amount below minimum", { amount: "0" }, "amount"],
    ["amount above maximum", { amount: "10001" }, "amount"],
    ["name above maximum", { name: "x".repeat(51) }, "name"],
    ["message above maximum", { message: "x".repeat(501) }, "message"],
  ])("rejects %s", (_name, override, field) => {
    const form = new FormData();
    form.set("type", "tmn");
    form.set("artifact", "false");
    form.set("link", "https://gift.truemoney.com/campaign/?v=abc");
    form.set("amount", "5");
    for (const [key, value] of Object.entries(override)) form.set(key, value);
    const parsed = parseDonationForm(form);
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(JSON.stringify(parsed.result.error)).toContain(field);
  });

  test("requires a valid payment branch and its payment artifact", () => {
    const form = new FormData();
    form.set("amount", "10");
    form.set("type", "pp");
    form.set("artifact", "false");
    const parsed = parseDonationForm(form);
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(JSON.stringify(parsed.result.error)).toContain("slip");
  });

  test("requires a valid UID when artifact promotion is selected", () => {
    const form = new FormData();
    form.set("amount", "10");
    form.set("type", "tmn");
    form.set("link", "https://gift.truemoney.com/campaign/?v=abc");
    form.set("artifact", "true");
    form.set("uid", "invalid");
    const parsed = parseDonationForm(form);
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(JSON.stringify(parsed.result.error)).toContain("uid");
  });

  test("applies anonymous and empty-message defaults", () => {
    const form = new FormData();
    form.set("amount", "5");
    form.set("type", "tmn");
    form.set("link", "https://gift.truemoney.com/campaign/?v=abc");
    const parsed = parseDonationForm(form);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Anonymous");
      expect(parsed.data.message).toBe("");
    }
  });
});

describe("donation payment processing", () => {
  test("returns a PromptPay check failure and emits only failure analytics", async () => {
    const deps = dependencies();
    deps.checkPromptPay = mock(async () => ({
      success: false as const,
      code: 400,
      message: "bad slip",
    }));
    expect(await processDonation(promptPayInput(), deps)).toEqual({
      error: { where: "slip", what: "400: bad slip" },
    });
    expect(deps.savePromptPaySlip).not.toHaveBeenCalled();
    expect(deps.saveDonation).not.toHaveBeenCalled();
    expect(deps.capture).toHaveBeenCalledWith({
      distinctId: "trace-id",
      event: "donation_slip_check_failed",
      properties: { amount: 20, code: 400, message: "bad slip" },
    });
  });

  test("rejects a duplicate PromptPay slip before creating a donation", async () => {
    const deps = dependencies();
    deps.savePromptPaySlip = mock(async () => false);
    expect(await processDonation(promptPayInput(), deps)).toEqual({
      error: { where: "slip", what: "สลิปนี้ถูกใช้ไปแล้ว" },
    });
    expect(deps.saveDonation).not.toHaveBeenCalled();
    expect(deps.capture).toHaveBeenLastCalledWith({
      distinctId: "trace-id",
      event: "donation_slip_conflict",
      properties: { amount: 20 },
    });
  });

  test("returns a TrueMoney failure without persisting", async () => {
    const deps = dependencies();
    deps.redeemTrueMoney = mock(async () => ({
      success: false as const,
      message: "voucher used",
    }));
    expect(await processDonation(trueMoneyInput(), deps)).toEqual({
      error: { where: "link", what: "voucher used" },
    });
    expect(deps.saveDonation).not.toHaveBeenCalled();
    expect(deps.capture).toHaveBeenLastCalledWith({
      distinctId: "trace-id",
      event: "donation_payment_failed",
      properties: { amount: 5, message: "voucher used" },
    });
  });

  test("saves successful TrueMoney donations below popup threshold", async () => {
    const deps = dependencies();
    expect(await processDonation(trueMoneyInput(), deps)).toEqual({
      toast: "ส่งเรียบร้อย",
      reset: true,
    });
    expect(deps.saveDonation).toHaveBeenCalledWith({
      name: "Buzz",
      amount: 5,
      message: "hello",
      image: undefined,
      method: "tmn",
      uid: null,
      sent: true,
    });
    expect(deps.publishUpdate).toHaveBeenCalledTimes(1);
    expect(deps.publishPopup).not.toHaveBeenCalled();
    expect(deps.capture).toHaveBeenLastCalledWith({
      distinctId: "trace-id",
      event: "donation_completed",
      properties: {
        amount: 5,
        payment_method: "tmn",
        artifact: false,
        has_image: false,
        on_screen: false,
      },
    });
  });

  test("promotes artifacts and publishes an image popup for qualifying donations", async () => {
    const deps = dependencies();
    const input = promptPayInput({
      artifact: "true",
      uid: "814006303",
      image: new File(["large"], "image.png", { type: "image/png" }),
    });
    await processDonation(input, deps);
    expect(deps.downscaleImage).toHaveBeenCalledWith(input.image);
    expect(deps.promoteArtifact).toHaveBeenCalledWith({
      name: "Buzz",
      message: "hello",
      uid: "814006303",
    });
    expect(deps.publishPopup).toHaveBeenCalledWith({
      id: "donation-1",
      name: "Buzz",
      amount: 20,
      message: "hello",
      image: "data:image/png;base64,c2xpcA==",
    });
    expect(deps.publishUpdate).not.toHaveBeenCalled();
  });

  test("artifact promotion is optional and does not fail a paid donation", async () => {
    const deps = dependencies();
    deps.promoteArtifact = mock(async () => {
      throw new Error("queue unavailable");
    });
    const originalError = console.error;
    console.error = mock(() => {});
    try {
      expect(
        await processDonation(
          promptPayInput({ artifact: "true", uid: "814006303" }),
          deps,
        ),
      ).toEqual({ toast: "ส่งเรียบร้อย", reset: true });
    } finally {
      console.error = originalError;
    }
    expect(deps.publishPopup).toHaveBeenCalledTimes(1);
  });
});

describe("donation configuration", () => {
  test("generates a PromptPay QR with configured values", () => {
    const generate = mock(() => "payload");
    const createQr = createPromptPayQrGenerator({
      identifier: "0812345678",
      type: "mobile",
      generate,
    });
    expect(createQr("12.50")).toBe("payload");
    expect(generate).toHaveBeenCalledWith({
      identifier: { type: "mobile", value: "0812345678" },
      amount: "12.50",
    });
  });

  test("rejects missing and invalid PromptPay configuration", () => {
    const generate = mock(() => "payload");
    expect(() => createPromptPayQrGenerator({ generate })(10)).toThrow(
      "PromptPay is not configured",
    );
    expect(() =>
      createPromptPayQrGenerator({
        identifier: "id",
        type: "bank",
        generate,
      })(10),
    ).toThrow("Invalid PromptPay type");
    expect(generate).not.toHaveBeenCalled();
  });

  test("requires a non-empty configured widget credential", () => {
    expect(() => requireWidgetCredential("secret", "secret")).not.toThrow();
    expect(() => requireWidgetCredential("wrong", "secret")).toThrow(
      "Unauthorized",
    );
    expect(() => requireWidgetCredential("secret", undefined)).toThrow(
      "Unauthorized",
    );
  });
});
