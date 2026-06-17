import { and, eq, gt, lt, not, or, sql } from "drizzle-orm";
import {
  AlertCircle,
  BookAlert,
  CircleDollarSign,
  SendHorizonal,
  X,
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import PromptpayImage from "#/assets/promptpay.jpg";
import banner from "#/logos/rubgram.webp";
import { Blocker } from "@/components/blocker";
import Image from "@/components/image";
import { SimpleTooltip } from "@/components/tooltip";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { db } from "@/lib/db";
import { endgameSubmissions } from "@/lib/db/schema";
import { LiveButton } from "../artifact/live";
import { Watcher } from "./admin/client";
import { getDiscordSession, getEndgameConfig } from "./api";
import {
  CancelButton,
  ClearCookie,
  Countdown,
  DownloadButton,
  PriceEstimation,
  ServiceSelector,
  SlipUpload,
  WelcomeScreening,
} from "./client";
import { EndgameFormWrapper } from "./form";
import { RulesDialog } from "./rules";

export const metadata: Metadata = {
  title: "รับกรรมแทนทางบ้าน",
  description: "รับเล่นคอนเทนต์เอนเกมเกนชินแทนคนดู",
};

export default async function EndgamePage() {
  const cookie = await cookies();
  const sid = cookie.get("rsid");
  const session = await getDiscordSession();
  const [q] = sid?.value
    ? await db
        .select({
          // Using endgame.submissions.queue here because
          // ${endgameSubmissions.queue} does not work
          queue: sql<number>`
            ${endgameSubmissions.queue} - (
              select count(*)
              from ${endgameSubmissions} e2
              where e2.checked = true
                and e2.queue < endgame.submissions.queue
            )
          `,
          paid: endgameSubmissions.paid,
          price: endgameSubmissions.price,
          expires: endgameSubmissions.expires,
        })
        .from(endgameSubmissions)
        .where(
          and(
            or(
              eq(endgameSubmissions.id, sid.value),
              and(
                eq(endgameSubmissions.user, session?.uid || "placeholder"),
                gt(endgameSubmissions.expires, new Date()),
              ),
            ),
            not(endgameSubmissions.deleted),
          ),
        )
    : [];
  const { count, ...config } = await getEndgameConfig();
  const [canExpire] = q
    ? await db
        .select({ queue: endgameSubmissions.queue })
        .from(endgameSubmissions)
        .where(
          and(
            not(endgameSubmissions.paid),
            lt(endgameSubmissions.queue, q.queue),
          ),
        )
    : [];

  return (
    <div className="flex h-svh flex-col items-center justify-center gap-2">
      <Card className="w-full max-w-md">
        {q ? (
          !q.paid ? (
            ""
          ) : (
            <Blocker>
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold">คิวของคุณคือหมายเลข</span>
                <span className="text-5xl font-bold">{q.queue}</span>
                {canExpire && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <SimpleTooltip text="มีบางคิวก่อนหน้าของคุณยังไม่ได้ชำระเงิน">
                      <AlertCircle size={16} />
                    </SimpleTooltip>
                    เลขคิวของคุณอาจมีการเปลื่ยนแปลง
                  </span>
                )}
              </div>
            </Blocker>
          )
        ) : config.locked ? (
          <Blocker>
            <span className="text-3xl font-bold">ยังไม่เปิดรับคิว</span>
          </Blocker>
        ) : config.full ? (
          <Blocker>
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold">คิวเต็มแล้ว</span>
            </div>
          </Blocker>
        ) : (
          <WelcomeScreening {...{ session }} />
        )}
        <CardHeader className="justify-center">
          <CardTitle>
            <div className="w-[276.5px]">
              <Link href="/">
                <Image
                  style={{
                    transform: "translateY(-70%)",
                  }}
                  className="absolute z-50"
                  height={137.5}
                  width={276.5}
                  src={banner}
                  alt="รับกรรมแทนทางบ้าน"
                />
              </Link>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {q ? (
            <EndgameFormWrapper id="mainform" type="payment">
              <div className="flex flex-col items-center gap-2">
                <div className="flex w-full gap-2">
                  <Image
                    src={PromptpayImage}
                    alt="Promptpay QR Code"
                    className="max-w-32 shrink-0 rounded"
                  />
                  <div className="relative flex shrink-0 flex-col">
                    <span className="text-lg font-bold">
                      ยอดชำระ {q.price} บาท{" "}
                      {q.expires && (
                        <Kbd suppressHydrationWarning>
                          <Countdown time={q.expires} refreshWhenOver />
                        </Kbd>
                      )}
                    </span>
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
                <SlipUpload />
              </div>
              <input hidden name="sid" readOnly value={sid?.value} />
            </EndgameFormWrapper>
          ) : (
            <EndgameFormWrapper id="mainform" type="registration">
              <div className="flex flex-col gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="name">ชื่อ*</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder={session?.display || "Mr. Buzz"}
                    autoComplete="name"
                    maxLength={32}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="server">เซิร์ฟเวอร์*</Label>
                  <Select name="server">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="เลือกเซิร์ฟเวอร์ที่คุณอยู่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>เซิร์ฟเวอร์</SelectLabel>
                        <SelectItem value="as">Asia</SelectItem>
                        <SelectItem value="us">America</SelectItem>
                        <SelectItem value="eu">Europe</SelectItem>
                        <SelectItem value="tw">TW, HK, MO</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <ServiceSelector {...{ count, ...config }} />
              </div>
              <input hidden name="user" readOnly value={session?.uid || ""} />
            </EndgameFormWrapper>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <div className="flex gap-2">
            <SimpleTooltip text="ลัดคิว 50 บาท (ไม่รวมยอดที่ต้องจ่าย)">
              <Link href="/donate" target="_blank" rel="noreferrer">
                <Button
                  variant="outline"
                  className={
                    config.limit >= 0 && count >= config.limit
                      ? "animate-pulse border-white! bg-emerald-600!"
                      : ""
                  }
                  type="button"
                >
                  <CircleDollarSign />
                </Button>
              </Link>
            </SimpleTooltip>
            <Tooltip>
              <RulesDialog>
                <TooltipTrigger asChild>
                  <Button variant="destructive" type="button">
                    <BookAlert />
                  </Button>
                </TooltipTrigger>
              </RulesDialog>
              <TooltipContent>อ่านกฏการลงคิว</TooltipContent>
            </Tooltip>
            {q && (
              <AlertDialog>
                <SimpleTooltip text="ยกเลิกคิว">
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button">
                      <X /> ยกเลิก
                    </Button>
                  </AlertDialogTrigger>
                </SimpleTooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>แน่ใจหรอ</AlertDialogTitle>
                    <AlertDialogDescription>
                      ต้องการยกเลิกการลงคิวของคุณหรือไม่
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
                    <CancelButton sid={sid!.value} />
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Suspense>
              <LiveButton />
            </Suspense>
          </div>
          <div className="flex items-center gap-2">
            {!q && <PriceEstimation />}
            <Kbd>
              {count} / {config.limit < 0 ? "∞" : config.limit} คิว
            </Kbd>
            <SimpleTooltip text="ถัดไป">
              <Button
                type="submit"
                form="mainform"
                disabled={
                  q?.paid ||
                  config.locked ||
                  (config.limit >= 0 && count >= config.limit)
                }
              >
                <SendHorizonal />
              </Button>
            </SimpleTooltip>
          </div>
        </CardFooter>
      </Card>
      <span className="m-1 rounded-sm border p-1 text-xs">
        หากติดปัญหา โปรดแจ้งผ่านทาง
        <a
          href="https://discord.gg/HQwDXNhxuK"
          className="text-green-200 underline"
        >
          ช่องดิสคอร์ด
        </a>
      </span>
      {sid && !q && <ClearCookie />}
      <Watcher />
    </div>
  );
}
