import { z } from "zod";
import { normalizePromptPayIdentifier } from "@/lib/promptpay";

export type SlipProvider = "slipok" | "slip2go";
export type SlipCheckResult = { provider: SlipProvider; raw?: unknown } & (
  | { success: true; data: { transRef: string; amount: number } }
  | { success: false; code: string | number; message: string }
);

type SlipEnvironment = Record<string, string | undefined>;

export function isSlipProvider(value: unknown): value is SlipProvider {
  return value === "slipok" || value === "slip2go";
}

export function getSlipConfiguration(
  provider: SlipProvider,
  env: SlipEnvironment = process.env,
) {
  const urlVariable =
    provider === "slipok" ? "SLIPOK_API_URL" : "SLIP2GO_VERIFY_URL";
  const keyVariable =
    provider === "slipok" ? "SLIPOK_API_KEY" : "SLIP2GO_API_SECRET";
  const url = env[urlVariable];
  const key = env[keyVariable];
  if (!url || !key)
    throw new Error(`Missing ${urlVariable} or ${keyVariable}.`);
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol))
    throw new Error(`Invalid ${urlVariable}.`);

  let receiver: { accountType: string; accountNumber: string } | undefined;
  if (provider === "slip2go") {
    const type = env.PROMPTPAY_TYPE;
    const value = env.PROMPTPAY_IDENTIFIER;
    if (
      !value ||
      (type !== "mobile" && type !== "nationalId" && type !== "ewallet")
    )
      throw new Error(
        "Slip2Go requires valid PROMPTPAY_TYPE and PROMPTPAY_IDENTIFIER.",
      );
    const identifier = normalizePromptPayIdentifier({ type, value });
    receiver = {
      accountType: { mobile: "02001", nationalId: "02003", ewallet: "02004" }[
        type
      ],
      accountNumber:
        type === "mobile" ? `0${identifier.value.slice(4)}` : identifier.value,
    };
  }
  return { url, key, receiver };
}

const transactionSchema = z.object({
  transRef: z.string().trim().min(1),
  amount: z.number().finite().positive(),
});
const envelopeSchema = z.object({
  success: z.boolean().optional(),
  code: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

export async function verifySlip(
  provider: SlipProvider,
  buffer: Buffer<ArrayBuffer>,
  type: string,
  amount: number,
  env: SlipEnvironment = process.env,
): Promise<SlipCheckResult> {
  const failure = (
    code: string | number,
    message: string,
    raw?: unknown,
  ): SlipCheckResult => ({ success: false, provider, code, message, raw });
  let config: ReturnType<typeof getSlipConfiguration>;
  try {
    config = getSlipConfiguration(provider, env);
  } catch {
    return failure("CONFIGURATION_ERROR", "ยังไม่ได้ตั้งค่าบริการตรวจสอบสลิปให้ครบถ้วน");
  }
  if (!Number.isFinite(amount) || amount <= 0)
    return failure("INVALID_AMOUNT", "ยอดเงินไม่ถูกต้อง");

  const formData = new FormData();
  const headers: Record<string, string> = {};
  if (provider === "slipok") {
    headers["x-authorization"] = config.key;
    formData.append("files", new Blob([buffer], { type }), "image");
    formData.append("amount", amount.toString());
  } else {
    headers.Authorization = config.key;
    formData.append("file", new Blob([buffer], { type }), "image");
    formData.append(
      "payload",
      JSON.stringify({
        checkAmount: { type: "eq", amount: amount.toString() },
        checkReceiver: [config.receiver],
      }),
    );
  }

  let response: Response;
  let raw: unknown;
  try {
    response = await fetch(config.url, {
      method: "POST",
      headers,
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });
    raw = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError)
      return failure("INVALID_RESPONSE", "บริการตรวจสอบสลิปส่งข้อมูลไม่ถูกต้อง");
    const timeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return failure(
      timeout ? "TIMEOUT" : "NETWORK_ERROR",
      "ไม่สามารถติดต่อบริการตรวจสอบสลิปได้ กรุณาลองใหม่",
    );
  }

  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success)
    return failure("INVALID_RESPONSE", "บริการตรวจสอบสลิปส่งข้อมูลไม่ถูกต้อง", raw);
  const envelope = parsed.data;
  const success =
    provider === "slipok"
      ? envelope.success === true
      : envelope.code === "200000" || envelope.code === "200200";
  if (!response.ok || !success)
    return failure(
      envelope.code ??
        (response.ok ? "VERIFICATION_FAILED" : `HTTP_${response.status}`),
      envelope.message ?? "ตรวจสอบสลิปไม่สำเร็จ",
      raw,
    );

  const transaction = transactionSchema.safeParse(envelope.data);
  if (!transaction.success)
    return failure(
      "INVALID_RESPONSE",
      "บริการตรวจสอบสลิปส่งข้อมูลธุรกรรมไม่ครบถ้วน",
      raw,
    );
  if (transaction.data.amount !== amount)
    return failure("AMOUNT_MISMATCH", "ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ", raw);
  return { success: true, provider, data: transaction.data, raw };
}
