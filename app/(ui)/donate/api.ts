"use server";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { donations, endgameSlips, submissions } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { checkSlip } from "@/lib/payment";
import { getPostHogClient } from "@/lib/posthog-server";
import { generatePromptPayPayload } from "@/lib/promptpay";
import { fileToDataUrl } from "@/lib/utils";
import {
  createPromptPayQrGenerator,
  parseDonationForm,
  processDonation,
} from "./service";

const {
  PROMPTPAY_IDENTIFIER,
  PROMPTPAY_TYPE,
  TMN_DEST_PHONE_NUM,
  SASTIFY_API_PRIVKEY,
} = process.env;
if (!PROMPTPAY_IDENTIFIER || !PROMPTPAY_TYPE)
  console.error("Warning: Missing PromptPay configuration!");

const generateQr = createPromptPayQrGenerator({
  identifier: PROMPTPAY_IDENTIFIER,
  type: PROMPTPAY_TYPE,
  generate: generatePromptPayPayload,
});

export async function generateQrcode(amount: number | string) {
  return generateQr(amount);
}

export async function submitDonation(data: FormData) {
  const parsed = parseDonationForm(data);
  if (!parsed.success) return parsed.result;
  const ph = getPostHogClient();

  return db.transaction(async (tx) =>
    processDonation(parsed.data, {
      createId: crypto.randomUUID,
      checkPromptPay: checkSlip,
      async savePromptPaySlip({ slip, amount, result }) {
        const [saved] = await tx
          .insert(endgameSlips)
          .values({
            slip,
            amount: amount.toString(),
            data: result as typeof endgameSlips.$inferInsert.data,
            ref: result.data.transRef,
          })
          .returning({ id: endgameSlips.id })
          .catch((error) => {
            console.log(error);
            return [];
          });
        return !!saved;
      },
      async redeemTrueMoney({ amount, link }) {
        return fetch("https://api.sastify.xyz/v1/gateway/tmn", {
          method: "POST",
          headers: {
            authorization: `Bearer ${SASTIFY_API_PRIVKEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            phone_number: TMN_DEST_PHONE_NUM,
            voucher_url: link,
          }),
          signal: AbortSignal.timeout(30_000),
        })
          .then((response) => response.json())
          .catch((error) => ({
            success: false as const,
            message: error instanceof Error ? error.message : String(error),
          }));
      },
      async downscaleImage(image) {
        return new Bun.Image(await image.arrayBuffer())
          .resize(512, 512)
          .webp()
          .toBuffer();
      },
      async saveDonation(input) {
        const [{ id }] = await tx
          .insert(donations)
          .values(input)
          .returning({ id: donations.id });
        return id;
      },
      async promoteArtifact({ name, message, uid }) {
        await tx.transaction(async (artifactTx) => {
          await artifactTx
            .insert(submissions)
            .values({
              name,
              comment: message,
              uid,
              queue: null as unknown as undefined,
            })
            .onConflictDoUpdate({
              target: submissions.uid,
              set: {
                comment: sql`${submissions.comment} || ${"\n"}::text || ${message}::text`,
                promoted: true,
              },
            });
        });
      },
      imageToDataUrl: fileToDataUrl,
      publishPopup: (popup) => sse.donate.pub("ping", popup),
      publishUpdate: () => sse.donate.pub("update", null),
      capture: (event) => ph.capture(event),
    }),
  );
}
