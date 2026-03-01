import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { eq } from "drizzle-orm";
import {
  BookAlert,
  CircleDollarSign,
  SendHorizonal,
  SquarePlay,
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import banner from "#/logos/artifact.webp";
import { Blocker } from "@/components/blocker";
import { ComboBox } from "@/components/combobox";
import Image from "@/components/image";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { getArtifactConfig } from "@/lib/api";
import { db } from "@/lib/db";
import { characters, submissions } from "@/lib/db/schema";
import { CharacterChooser, ClearCookie, Disclaimer } from "./client";
import { ArtifactFormWrapper } from "./form";
import { LiveButton } from "./live";
import { RulesDialog } from "./rules";

export const metadata: Metadata = {
  title: "เสือกไอดีชาวบ้าน",
  description: "ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม",
};

export default async function ArtifactFormPage() {
  const cookie = await cookies();
  const sid = cookie.get("sid");
  const [q] = sid?.value
    ? await db
        .select({ queue: submissions.queue })
        .from(submissions)
        .where(eq(submissions.id, sid.value))
    : [];
  const clist = await db
    .select({
      label: characters.name,
      value: characters.name,
    })
    .from(characters)
    .orderBy(characters.name);
  const config = await getArtifactConfig();
  const count = await db.$count(submissions);

  return (
    <div className="flex justify-around items-center h-svh">
      <div className="hidden md:block p-5">
        <div className="aspect-video w-110"></div>
      </div>
      <Card className="w-full max-w-md">
        {q ? (
          <Blocker>
            <div className="flex gap-1 flex-col items-center">
              <span className="font-bold text-3xl">คิวของคุณคือหมายเลข</span>
              <span className="font-bold text-5xl">{q.queue}</span>
            </div>
          </Blocker>
        ) : config.locked ? (
          <Blocker>
            <span className="font-bold text-3xl">ยังไม่เปิดรับคิว</span>
          </Blocker>
        ) : config.limit >= 0 && count >= config.limit ? (
          <Blocker>
            <div className="flex gap-1 flex-col items-center">
              <span className="font-bold text-3xl">คิวเต็มแล้ว</span>
              <span className="font-bold text-2xl">ต้องโดเนทลัดคิวแล้วล่ะ</span>
            </div>
          </Blocker>
        ) : (
          <Disclaimer />
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
                  alt="เสือกไอดีชาวบ้าน"
                />
              </Link>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ArtifactFormWrapper id="mainform">
            <div className="flex flex-col gap-3">
              <div className="grid gap-2">
                <Label htmlFor="name">ชื่อ*</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Mr.Buzz"
                  autoComplete="name"
                  maxLength={64}
                  required
                />
              </div>
              {config.enka ? (
                <CharacterChooser clist={clist} />
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="uid">UID*</Label>
                    <Input
                      id="uid"
                      name="uid"
                      type="number"
                      required
                      placeholder="814006303"
                      maxLength={10}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="character">ตัวละคร*</Label>
                    <ComboBox
                      placeholder="ค้นหาตัวละคร"
                      id="character"
                      name="character"
                      data={clist}
                      className="w-full bg-transparent! hover:bg-accent!"
                    />
                  </div>
                </>
              )}
              <div className="grid gap-2">
                <Label htmlFor="comment">ข้อความเพิ่มเติม</Label>
                <Textarea
                  id="comment"
                  name="comment"
                  placeholder="เช่น Er พอไหมครับ, คริสวยยังครับ (ไม่บังคับ)"
                  className="bg-card!"
                  maxLength={1024}
                />
              </div>
            </div>
          </ArtifactFormWrapper>
        </CardContent>
        <CardFooter className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <SimpleTooltip text="โดเนทลัดคิว ขั้นต่ำ 10 บาท">
              <Link
                href="https://tipme.in.th/536d969652666273c2fa85ad"
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  variant="outline"
                  className={
                    config.limit >= 0 && count >= config.limit
                      ? "bg-emerald-600! border-white! animate-pulse"
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
            <Suspense>
              <LiveButton />
            </Suspense>
          </div>
          <div className="flex gap-2 items-center">
            <span className="p-1">
              {count} / {config.limit < 0 ? "∞" : config.limit}
            </span>
            <SimpleTooltip text="ส่งเลยจัฟลูกพี่">
              <Button
                type="submit"
                form="mainform"
                disabled={
                  !!q ||
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
      <div className="hidden md:block bg-card p-5 rounded border border-border relative">
        <span className="absolute font-semibold text-7xl -translate-y-3/4 w-110 text-center text-shadow-lg/80">
          Guide
        </span>
        <video
          src="https://cdn.gunshiz.top/buzz/artifact/guide.mp4"
          controls
          className="aspect-video w-110"
        >
          <track kind="captions" />
        </video>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <div className="md:hidden absolute w-full bottom-0 p-1 font-semibold div flex justify-center items-center gap-2 text-xl bg-input/30 border">
            <SquarePlay />
            วิธีลงทะเบียน
          </div>
        </DialogTrigger>
        <DialogContent className="p-1">
          <DialogTitle className="hidden">Guide</DialogTitle>
          <video
            src="https://cdn.gunshiz.top/buzz/artifact/guide.mp4"
            controls
            autoPlay
            className="aspect-video w-110"
          >
            <track kind="captions" />
          </video>
        </DialogContent>
      </Dialog>
      {sid && !q && <ClearCookie />}
    </div>
  );
}
