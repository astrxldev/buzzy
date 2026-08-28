"use server";

import { generatePromptPayPayload } from "@/lib/promptpay";
import { env } from "bun";

const { PROMPTPAY_IDENTIFIER, PROMPTPAY_TYPE } = env;
if (!PROMPTPAY_IDENTIFIER || !PROMPTPAY_TYPE)
  console.error("Warning: Missing PromptPay configuration!");

export async function generateQrcode(amount: number | string) {
  return generatePromptPayPayload({
    identifier: {
      type: PROMPTPAY_TYPE! as "mobile" | "nationalId" | "ewallet",
      value: PROMPTPAY_IDENTIFIER!,
    },
    amount,
  });
}
