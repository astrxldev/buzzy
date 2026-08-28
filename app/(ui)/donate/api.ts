"use server";

import { generatePromptPayPayload } from "@/lib/promptpay";

export async function generateQrcode(amount: number | string) {
  return generatePromptPayPayload({
    identifier: { type: "nationalId", value: "1729900808055" },
    amount,
  });
}
