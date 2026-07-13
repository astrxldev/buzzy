import { sql } from "drizzle-orm";
import { QrCodeIcon, SendIcon } from "lucide-react";
import type { Metadata } from "next";
import z from "zod";
import { th } from "zod/v4/locales";
import PromptpayImage from "#/assets/promptpay.jpg";
import TruemoneyIcon from "#/assets/tmn.webp";
import DonateLogo from "#/logos/donate.webp";
import Cropper from "@/components/cropper";
import {
  FormAction,
  FormChoice,
  FormIf,
  FormInput,
  FormProvider,
  FormTab,
  FormWrapper,
} from "@/components/form";
import { type FormSubmitResult, formParse } from "@/components/form-submit";
import Image from "@/components/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getArtifactConfig } from "@/lib/api";
import { uidRegex } from "@/lib/const";
import { db } from "@/lib/db";
import { donations, endgameSlips, submissions } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { checkSlip } from "@/lib/payment";
import { getPostHogClient } from "@/lib/posthog-server";
import { fileToDataUrl } from "@/lib/utils";
import {
  CurrencyInput,
  SlipUpload,
} from "../rubgram/admin/@modal/manual/client";
import { DownloadButton } from "../rubgram/client";
import Link from "next/link";

const { TMN_DEST_PHONE_NUM, SASTIFY_API_PRIVKEY } = process.env as Record<
  string,
  string
>;

export const metadata: Metadata = {
  title: "โดเนท",
};

type SastifyApiResponse =
  | {
      success: true;
      data: {
        amount: number;
        status: "SUCCESS";
      };
    }
  | {
      success: false;
      code?: string | number;
      message: string;
    };

z.config(th());

//#region Schema
const Schema = z
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
      // impossible but edge case
      "internal: ประเภท donate ไม่ถูกต้อง",
    ),
  )
  .and(
    z.discriminatedUnion("artifact", [
      z.object({
        artifact: z.literal("false").optional(),
      }),
      z.object({
        artifact: z.literal("true"),
        uid: z
          .string("ใส่ UID สำหรับการดูแฟกต์ด้วย")
          .regex(uidRegex, "รูปแบบ UID ไม่ถูกต้อง"),
      }),
    ]),
  );

export default async function () {
  //#region Server Data Load
  const artifactConfig = await getArtifactConfig();
  //#region Submit Handler
  async function submit(data: FormData): Promise<FormSubmitResult> {
    "use server";
    const { $, error } = formParse(Schema, data);
    if (error) return { error };

    const ph = getPostHogClient();
    const distinctId = crypto.randomUUID();

    return await db.transaction(async (tx): Promise<FormSubmitResult> => {
      if ($.type === "pp") {
        const arrayBuffer = await $.slip.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const processed = await checkSlip(buffer, $.slip.type, $.amount);
        if (!processed.success) {
          ph.capture({
            distinctId,
            event: "donation_slip_check_failed",
            properties: {
              amount: $.amount,
              code: processed.code,
              message: processed.message,
            },
          });
          return {
            error: {
              where: "slip",
              what: `${processed.code}: ${processed.message}`,
            },
          };
        }
        const [check] = await tx
          .insert(endgameSlips)
          .values({
            slip: buffer,
            amount: $.amount.toString(),
            data: processed,
            ref: processed.data.transRef,
          })
          .returning({ id: endgameSlips.id })
          .catch((e) => {
            console.log(e);
            return [{ id: "conflict" }];
          });
        if (check.id === "conflict") {
          ph.capture({
            distinctId,
            event: "donation_slip_conflict",
            properties: { amount: $.amount },
          });
          return { error: { where: "slip", what: "สลิปนี้ถูกใช้ไปแล้ว" } };
        }
      } else {
        const res: SastifyApiResponse = await fetch(
          "https://api.sastify.xyz/v1/gateway/tmn",
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${SASTIFY_API_PRIVKEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: $.amount,
              phone_number: TMN_DEST_PHONE_NUM,
              voucher_url: $.link,
            }),
            signal: AbortSignal.timeout(30_000),
          },
        )
          .then((r) => r.json())
          .catch((e) => e);
        if (!res.success) {
          ph.capture({
            distinctId,
            event: "donation_payment_failed",
            properties: { amount: $.amount, message: res.message },
          });
          return { error: { where: "link", what: res.message } };
        }
      }

      const { name, amount, message, image } = $;

      const downscaled = image
        ? await new Bun.Image(await image.arrayBuffer())
            .resize(512, 512)
            .webp()
            .toBuffer()
        : undefined;

      const [{ id }] = await tx
        .insert(donations)
        .values({
          name,
          amount,
          message,
          image: downscaled,
          uid: $.artifact === "true" ? $.uid : null,
          // dont send on screen if less than 10
          sent: $.amount < 10,
        })
        .returning({ id: donations.id });
      if ($.artifact === "true") {
        // const res = await tx
        await tx
          .insert(submissions)
          .values({
            name,
            comment: message,
            uid: $.uid,
            queue: null as unknown as undefined,
          })
          .onConflictDoUpdate({
            target: submissions.uid,
            set: {
              comment: sql`${submissions.comment} || ${"\n"}::text || ${message}::text`,
              promoted: true,
            },
          })
          // .onConflictDoNothing();
          .catch(console.error);
        // if (res === "conflict") {
        //   tx.rollback();
        //   ph.capture({
        //     distinctId,
        //     event: "donation_artifact_conflict",
        //     properties: { amount: $.amount, uid: $.uid },
        //   });
        //   return { error: { where: "uid", what: "ไม่สามารถสร้างคิวลัดได้" } };
        // }
      }
      if ($.amount >= 10)
        sse.donate.pub("ping", {
          id,
          name,
          amount,
          message,
          image: image ? await fileToDataUrl(image) : undefined,
        });
      else sse.donate.pub("update", null);

      ph.capture({
        distinctId,
        event: "donation_completed",
        properties: {
          amount: $.amount,
          payment_method: $.type,
          artifact: $.artifact === "true",
          has_image: !!image,
          on_screen: $.amount >= 10,
        },
      });

      return { toast: "ส่งเรียบร้อย", reset: true };
    });
  }

  //#region TSX
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="w-full max-w-md rounded-md border bg-card p-5">
        {/* oxlint-disable-next-line tailwindcss/enforce-canonical */}
        <div className="relative aspect-[304.5/30] w-full">
          <Link href="/">
            <Image
              src={DonateLogo}
              alt="Donate Logo"
              className="absolute left-1/2 w-3/4 -translate-x-1/2 -translate-y-2/3"
            />
          </Link>
        </div>
        <FormProvider id="tip" inDialog={false} onSubmit={submit}>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-end">
            <FormInput name="image" className="w-fit">
              <Cropper />
            </FormInput>
            <div className="grid w-full grow gap-4 [&>label]:-mb-2">
              <FormInput name="name" label="ชื่อ" subLabel="ไม่จำเป็น">
                <Input placeholder="Anonymous" />
              </FormInput>
              <FormInput
                name="amount"
                label="จำนวนโดเนท"
                subLabel="ขึ้นจอขั้นต่ำ 10 บาท"
              >
                <CurrencyInput placeholder="ขั้นต่ำ 1 บาท" />
              </FormInput>
            </div>
          </div>
          <FormInput name="message" label="ข้อความ" subLabel="สูงสุด 200 ตัวอักษร">
            <Textarea placeholder="ข้อความ" />
          </FormInput>
          {!artifactConfig.locked && (
            <>
              <FormInput name="artifact">
                <FormWrapper className="flex items-center gap-2">
                  <Checkbox />
                  ลัดคิวเสือกไอดีชาวบ้าน
                </FormWrapper>
              </FormInput>
              <FormIf artifact={true}>
                <FormInput name="uid" label="UID สำหรับเสือกไอดีชาวบ้าน">
                  <Input placeholder="814006303" />
                </FormInput>
              </FormIf>
            </>
          )}
          <FormTab
            label="วิธีการโอนเงิน"
            name="type"
            tabs={[
              {
                label: (
                  <span className="flex items-center gap-1">
                    <Image
                      src={TruemoneyIcon}
                      alt="Truemoney"
                      className="h-6 w-12 object-cover"
                    />
                    TrueMoney
                  </span>
                ),
                value: "tmn",
              },
              // {
              //   label: (
              //     <span className="flex items-center gap-1">
              //       <QrCodeIcon className="size-6" />
              //       PromptPay
              //     </span>
              //   ),
              //   value: "pp",
              // },
            ]}
          >
            <FormChoice value="tmn">
              <FormInput name="link" label="ลิ้งค์อั่งเปา">
                <Input placeholder="https://gift.truemoney.com/campaign/?v=..." />
              </FormInput>
            </FormChoice>
            <FormChoice value="pp">
              <div className="flex w-full gap-2 pb-2">
                <Image
                  src={PromptpayImage}
                  alt="Promptpay QR Code"
                  className="max-w-32 shrink-0 rounded"
                />
                <div className="relative flex shrink-0 flex-col">
                  <span className="text-sm font-bold">บัญชีรับโดเนท</span>
                  <span className="text-sm text-muted-foreground">
                    ผู้รับ: นาย พัชรพล พลพันธุ์
                  </span>
                  <span className="text-sm text-muted-foreground">
                    บัญชี: xxx-x-x8666-x
                  </span>
                  <span className="text-sm text-muted-foreground">
                    เลขที่อ้างอิง: 004999056945438
                  </span>
                  <DownloadButton />
                </div>
              </div>
              <FormInput name="slip">
                <SlipUpload />
              </FormInput>
            </FormChoice>
          </FormTab>
          <div className="flex justify-end">
            <Button asChild>
              <FormAction
                disabled
                type="submit"
                loading={
                  <>
                    <Spinner />
                    กำลังโดเนท
                  </>
                }
              >
                <SendIcon />
                โดเนท
              </FormAction>
            </Button>
          </div>
        </FormProvider>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
