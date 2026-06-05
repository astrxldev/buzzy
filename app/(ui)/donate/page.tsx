import { formParse } from "@/components/form-submit";
import {
  FormAction,
  FormChoice,
  FormInput,
  FormProvider,
  FormRow,
  FormTab,
} from "@/components/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CurrencyInput,
  SlipUpload,
} from "../rubgram/admin/@modal/manual/client";
import Image from "@/components/image";
import PromptpayImage from "#/assets/promptpay.jpg";
import { DownloadButton } from "../rubgram/client";
import { QrCodeIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import TruemoneyIcon from "#/assets/tmn.webp";
import z from "zod";
import { th } from "zod/v4/locales";
import Cropper from "@/components/cropper";

z.config(th());

const Schema = z
  .object({
    name: z.string().max(50, { error: "ชื่อยาวสุด 50 ตัวอักษร" }).optional(),
    message: z
      .string()
      .max(500, { error: "ข้อความยาวสุด 200 ตัวอักษร" })
      .optional(),
    amount: z.coerce
      .number({ error: "จำนวนต้องเป็นตัวเลข" })
      .min(10, { error: "โดเนทขั้นต่ำ 10 บาท" }),
  })
  .and(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("tmn"),
        link: z.httpUrl(),
      }),
      z.object({
        type: z.literal("pp"),
        slip: z.file(),
      }),
    ]),
  );

export default async function () {
  async function submit(data: FormData) {
    "use server";
    const { $, error } = formParse(Schema, data);
    if (error) return { error };

    return { toast: "ระบบยังไม่เสร็จ" };
  }

  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="p-5 bg-card border rounded-md w-full max-w-md">
        <FormProvider id="tip" inDialog={false} onSubmit={submit}>
          <FormRow>
            <FormInput name="image" className="h-full">
              <Cropper />
            </FormInput>
            <div className="grid gap-4 [&>label]:-mb-2 grow">
              <FormInput name="name" label="ชื่อ" subLabel="ไม่จำเป็น">
                <Input placeholder="Anonymous" />
              </FormInput>
              <FormInput name="amount" label="จำนวนโดเนท" subLabel="ขึ้นจอขั้นต่ำ 10 บาท">
                <CurrencyInput placeholder="ขั้นต่ำ 1 บาท" />
              </FormInput>
            </div>
          </FormRow>
          <FormInput name="message" label="ข้อความ" subLabel="max. 500 ตัวอักษร">
            <Textarea placeholder="ข้อความ" />
          </FormInput>
          <FormTab
            label="วิธีการโอนเงิน"
            name="type"
            tabs={[
              {
                label: (
                  <span className="flex gap-1 items-center">
                    <Image
                      src={TruemoneyIcon}
                      alt="Truemoney"
                      className="w-12 h-6 object-cover"
                    />
                    TrueMoney
                  </span>
                ),
                value: "tmn",
              },
              {
                label: (
                  <span className="flex gap-1 items-center">
                    <QrCodeIcon className="size-6" />
                    PromptPay
                  </span>
                ),
                value: "pp",
              },
            ]}
          >
            <FormChoice value="tmn">
              <FormInput name="link" label="ลิ้งค์อั่งเปา">
                <Input placeholder="https://gift.truemoney.com/campaign/?v=..." />
              </FormInput>
            </FormChoice>
            <FormChoice value="pp">
              <div className="flex gap-2 w-full pb-2">
                <Image
                  src={PromptpayImage}
                  alt="Promptpay QR Code"
                  className="rounded max-w-32 shrink-0"
                />
                <div className="flex flex-col shrink-0 relative">
                  <span className="font-bold text-sm">บัญชีรับโดเนท</span>
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
                    Creating...
                  </>
                }
              >
                <SendIcon />
                ส่งเลยจัฟลูกพี่
              </FormAction>
            </Button>
          </div>
        </FormProvider>
      </div>
    </div>
  );
}
