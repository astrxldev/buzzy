import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { eq, isNotNull, sql } from "drizzle-orm";
import {
  BookAlert,
  CircleDollarSign,
  PencilIcon,
  SendHorizonal,
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
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { getArtifactConfig } from "@/lib/api";
import { db } from "@/lib/db";
import { characters, submissions } from "@/lib/db/schema";
import {
  CharacterChooser,
  ClearCookie,
  Disclaimer,
  WarningDialog,
} from "./client";
import { ArtifactFormWrapper } from "./form";
import { LiveButton } from "./live";
import { RulesDialog } from "./rules";

export const metadata: Metadata = {
  title: "เสือกไอดีชาวบ้าน",
  description: "ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม",
};

export default async function ArtifactFormPage({
  searchParams,
}: PageProps<"/artifact">) {
  const cookie = await cookies();
  const sid = cookie.get("sid");
  const [q] = sid?.value
    ? await db.select().from(submissions).where(eq(submissions.id, sid.value))
    : [];
  const clist = await db
    .select({
      label: characters.name,
      value: characters.name,
    })
    .from(characters)
    .orderBy(characters.name);
  const config = await getArtifactConfig();
  const count = await db
    .select({ a: sql`NULL` })
    .from(submissions)
    .where(isNotNull(submissions.queue))
    .then((e) => e.length);
  const { edit: searchEdit } = await searchParams;
  const editing = q && searchEdit === q.editToken && q.edits < 5;

  return (
    <div className="flex h-svh items-center justify-around">
      {/*
      <div className="hidden md:block p-5">
        <div className="aspect-video w-110"></div>
      </div>
      */}
      <Card className="w-full max-w-md">
        {editing ? (
          ""
        ) : q ? (
          <Blocker>
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold">คิวของคุณคือหมายเลข</span>
              <span className="text-5xl font-bold">{q.queue}</span>
            </div>
            {q.edits < 5 && !q.checked ? (
              <SimpleTooltip text="แก้ไข">
                <Button
                  className="absolute right-0 bottom-0 m-2"
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <Link href={`?edit=${q.editToken}`}>
                    <PencilIcon />
                  </Link>
                </Button>
              </SimpleTooltip>
            ) : (
              <Button
                className="absolute right-0 bottom-0 m-2 bg-red-500/50!"
                variant="outline"
                disabled
              >
                <PencilIcon />
                แก้ไม่ได้แล้ว
              </Button>
            )}
          </Blocker>
        ) : config.locked ? (
          <Blocker>
            <span className="text-3xl font-bold">ยังไม่เปิดรับคิว</span>
          </Blocker>
        ) : config.limit >= 0 && count >= config.limit ? (
          <Blocker>
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold">คิวเต็มแล้ว</span>
              <span className="text-2xl font-bold">ต้องโดเนทลัดคิวแล้วล่ะ</span>
              <SimpleTooltip text="โดเนทลัดคิว ขั้นต่ำ 10 บาท" side="bottom">
                <Link href="/donate" target="_blank" rel="noreferrer">
                  <Button
                    className="animate-pulse border-white! bg-emerald-600!"
                    type="button"
                  >
                    <CircleDollarSign />
                  </Button>
                </Link>
              </SimpleTooltip>
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
          <ArtifactFormWrapper
            id="mainform"
            edit={q ? { token: q.editToken, sub: q.id } : undefined}
            enka={config.enka}
          >
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
                  defaultValue={editing ? q.name : undefined}
                />
              </div>
              {config.enka ? (
                editing ? (
                  <CharacterChooser
                    clist={clist}
                    uid={q.uid}
                    char={q.char ?? undefined}
                  />
                ) : (
                  <CharacterChooser clist={clist} />
                )
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
                      defaultValue={editing ? q.uid : undefined}
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
                      defaultValue={editing ? (q.char ?? undefined) : undefined}
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
                  defaultValue={editing ? q.comment : undefined}
                />
              </div>
            </div>
          </ArtifactFormWrapper>
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <div className="flex gap-2">
            <SimpleTooltip text="โดเนทลัดคิว ขั้นต่ำ 10 บาท">
              <Link href="/donate" target="_blank" rel="noreferrer">
                <Button variant="outline" type="button">
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
            {editing ? (
              <Button variant="destructive" asChild>
                <Link href="?">ยกเลิก</Link>
              </Button>
            ) : (
              <Suspense>
                <LiveButton />
              </Suspense>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Kbd>
              {count} / {config.limit < 0 ? "∞" : config.limit} คิว
            </Kbd>
            <SimpleTooltip text="ส่งเลยจัฟลูกพี่">
              <Button
                type="submit"
                form="mainform"
                disabled={
                  (!!q ||
                    config.locked ||
                    (config.limit >= 0 && count >= config.limit)) &&
                  !editing
                }
              >
                {editing ? <PencilIcon /> : <SendHorizonal />}
              </Button>
            </SimpleTooltip>
          </div>
        </CardFooter>
      </Card>
      {sid && !q && <ClearCookie />}
      <WarningDialog />
    </div>
  );
}
