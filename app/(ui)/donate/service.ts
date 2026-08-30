import z from "zod";
import { th } from "zod/v4/locales";
import type { FormSubmitResult } from "@/components/form-submit";
import { uidRegex } from "@/lib/const";

z.config(th());

export const donationSchema = z
  .object({
    name: z.string().max(50, "ชื่อยาวสุด 50 ตัวอักษร").default("Anonymous"),
    message: z.string().max(500, "ข้อความยาวสุด 200 ตัวอักษร").default(""),
    amount: z.coerce
      .number("จำนวนต้องเป็นตัวเลข")
      .min(1, "โดเนทขั้นต่ำ 1 บาท")
      .max(10000, "โดเนทได้ไม่เกิน 1 หมื่นบาท"),
    image: z.file().optional(),
  })
  .and(
    z.discriminatedUnion(
      "type",
      [
        z.object({
          type: z.literal("tmn").optional(),
          link: z.httpUrl("ใส่ลิ้งค์อั่งเปา TrueMoney ก่อน"),
        }),
        z.object({
          type: z.literal("pp"),
          slip: z.file("อัพโหลดสลิปโอนเงินด้วย"),
        }),
      ],
      "internal: ประเภท donate ไม่ถูกต้อง",
    ),
  )
  .and(
    z.discriminatedUnion("artifact", [
      z.object({ artifact: z.literal("false").optional() }),
      z.object({
        artifact: z.literal("true"),
        uid: z
          .string("ใส่ UID สำหรับการดูแฟกต์ด้วย")
          .regex(uidRegex, "รูปแบบ UID ไม่ถูกต้อง"),
      }),
    ]),
  );

export type DonationInput = z.output<typeof donationSchema>;

type PaymentFailure = {
  success: false;
  code?: string | number;
  message: string;
};
type PromptPayResult =
  | { success: true; data: { transRef: string }; [key: string]: unknown }
  | PaymentFailure;
type TrueMoneyResult =
  | { success: true; data: { amount: number; status: "SUCCESS" } }
  | PaymentFailure;

export type DonationEvent = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

export type DonationDependencies = {
  createId: () => string;
  checkPromptPay: (
    data: Buffer<ArrayBuffer>,
    contentType: string,
    amount: number,
  ) => Promise<PromptPayResult>;
  savePromptPaySlip: (input: {
    slip: Buffer<ArrayBuffer>;
    amount: number;
    result: Extract<PromptPayResult, { success: true }>;
  }) => Promise<boolean>;
  redeemTrueMoney: (input: {
    amount: number;
    link: string;
  }) => Promise<TrueMoneyResult>;
  downscaleImage: (image: File) => Promise<Buffer>;
  saveDonation: (input: {
    name: string;
    amount: number;
    message: string;
    image?: Buffer;
    method: "tmn" | "pp";
    uid: string | null;
    sent: boolean;
  }) => Promise<string>;
  promoteArtifact: (input: {
    name: string;
    message: string;
    uid: string;
  }) => Promise<void>;
  imageToDataUrl: (image: File) => Promise<string>;
  publishPopup: (data: {
    id: string;
    name: string;
    amount: number;
    message: string;
    image?: string;
  }) => unknown;
  publishUpdate: () => unknown;
  capture: (event: DonationEvent) => unknown;
};

export function parseDonationForm(
  data: FormData,
):
  | { success: true; data: DonationInput }
  | { success: false; result: Exclude<FormSubmitResult, undefined> } {
  const parsed = donationSchema.safeParse(Object.fromEntries(data.entries()));
  if (parsed.success) return parsed;
  if (
    parsed.error.issues.length === 1 &&
    parsed.error.issues[0].path.length === 0
  )
    return {
      success: false,
      result: { error: parsed.error.issues[0].message },
    };
  return {
    success: false,
    result: {
      error: parsed.error.issues.map((issue) => ({
        what: issue.message,
        where: issue.path.join("."),
      })),
    },
  };
}

export async function processDonation(
  input: DonationInput,
  dependencies: DonationDependencies,
): Promise<FormSubmitResult> {
  const distinctId = dependencies.createId();

  if (input.type === "pp") {
    const slip = Buffer.from(await input.slip.arrayBuffer());
    const result = await dependencies.checkPromptPay(
      slip,
      input.slip.type,
      input.amount,
    );
    if (!result.success) {
      dependencies.capture({
        distinctId,
        event: "donation_slip_check_failed",
        properties: {
          amount: input.amount,
          code: result.code,
          message: result.message,
        },
      });
      return {
        error: { where: "slip", what: `${result.code}: ${result.message}` },
      };
    }
    if (
      !(await dependencies.savePromptPaySlip({
        slip,
        amount: input.amount,
        result,
      }))
    ) {
      dependencies.capture({
        distinctId,
        event: "donation_slip_conflict",
        properties: { amount: input.amount },
      });
      return { error: { where: "slip", what: "สลิปนี้ถูกใช้ไปแล้ว" } };
    }
  } else {
    const result = await dependencies.redeemTrueMoney({
      amount: input.amount,
      link: input.link,
    });
    if (!result.success) {
      dependencies.capture({
        distinctId,
        event: "donation_payment_failed",
        properties: { amount: input.amount, message: result.message },
      });
      return { error: { where: "link", what: result.message } };
    }
  }

  const image = input.image
    ? await dependencies.downscaleImage(input.image)
    : undefined;
  const id = await dependencies.saveDonation({
    name: input.name,
    amount: input.amount,
    message: input.message,
    image,
    method: input.type ?? "tmn",
    uid: input.artifact === "true" ? input.uid : null,
    sent: input.amount < 10,
  });

  if (input.artifact === "true") {
    try {
      await dependencies.promoteArtifact({
        name: input.name,
        message: input.message,
        uid: input.uid,
      });
    } catch (error) {
      console.error(error);
    }
  }

  if (input.amount >= 10) {
    dependencies.publishPopup({
      id,
      name: input.name,
      amount: input.amount,
      message: input.message,
      image: input.image
        ? await dependencies.imageToDataUrl(input.image)
        : undefined,
    });
  } else dependencies.publishUpdate();

  dependencies.capture({
    distinctId,
    event: "donation_completed",
    properties: {
      amount: input.amount,
      payment_method: input.type ?? "tmn",
      artifact: input.artifact === "true",
      has_image: !!input.image,
      on_screen: input.amount >= 10,
    },
  });
  return { toast: "ส่งเรียบร้อย", reset: true };
}

export function requireWidgetCredential(
  provided: string | null | undefined,
  configured: string | null | undefined,
) {
  if (!configured || !provided || provided !== configured)
    throw new Error("Unauthorized");
}

export function createPromptPayQrGenerator(dependencies: {
  identifier?: string;
  type?: string;
  generate: (options: {
    identifier: {
      type: "mobile" | "nationalId" | "ewallet";
      value: string;
    };
    amount: number | string;
  }) => string;
}) {
  return (amount: number | string) => {
    if (!dependencies.identifier || !dependencies.type)
      throw new Error("PromptPay is not configured");
    if (!["mobile", "nationalId", "ewallet"].includes(dependencies.type))
      throw new Error("Invalid PromptPay type");
    return dependencies.generate({
      identifier: {
        type: dependencies.type as "mobile" | "nationalId" | "ewallet",
        value: dependencies.identifier,
      },
      amount,
    });
  };
}
