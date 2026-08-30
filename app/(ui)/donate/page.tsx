import { CircleX, QrCodeIcon, SendIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import Image from "@/components/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getArtifactConfig } from "@/lib/api";
import {
  CurrencyInput,
  SlipUpload,
} from "../rubgram/admin/@modal/manual/client";
import { DownloadButton } from "../rubgram/client";
import { submitDonation } from "./api";
import { DynamicPPQR } from "./ppqr";

export const metadata: Metadata = {
  title: "โดเนท",
};

export default async function () {
  //#region Server Data Load
  const artifactConfig = await getArtifactConfig();

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
        <FormProvider id="tip" inDialog={false} onSubmit={submitDonation}>
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
                    <QrCodeIcon className="size-6" />
                    PromptPay
                  </span>
                ),
                value: "pp",
              },
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
            ]}
          >
            <FormChoice value="tmn">
              {artifactConfig.donateTruemoney ? (
                <FormInput name="link" label="ลิ้งค์อั่งเปา">
                  <Input placeholder="https://gift.truemoney.com/campaign/?v=..." />
                </FormInput>
              ) : (
                <div className="flex gap-2">
                  <CircleX className="text-red-500" />{" "}
                  ขณะนี้การโอนเงินด้วยทรูมันนี่ใช้ไม่ได้ชั่วคราว
                </div>
              )}
            </FormChoice>
            <FormChoice value="pp">
              {artifactConfig.donatePromptpay ? (
                <>
                  <div className="flex w-full gap-2 pb-2">
                    <DynamicPPQR />
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
                </>
              ) : (
                <div className="flex gap-2">
                  <CircleX className="text-red-500" />{" "}
                  ขณะนี้การโอนเงินด้วยพร้อมเพย์ใช้ไม่ได้ชั่วคราว
                </div>
              )}
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
