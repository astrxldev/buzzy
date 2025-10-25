import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { eq } from "drizzle-orm";
import { BookAlert, CircleDollarSign, SendHorizonal } from "lucide-react";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import banner from "#/logos/artifact.webp";
import { Blocker } from "@/components/blocker";
import { ComboBox } from "@/components/combobox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { getArtifactConfig } from "@/lib/api";
import { db } from "@/lib/db";
import { characters, submissions } from "@/lib/db/schema";
import { PageTransition } from "../transition";
import { CharacterChooser, ClearCookie, Disclaimer } from "./client";
import { ArtifactFormWrapper } from "./form";
import { LiveButton } from "./live";
import { RulesDialog } from "./rules";

export const metadata = {
  title: "เสือกไอดีชาวบ้าน",
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
    .from(characters);
  const config = await getArtifactConfig();
  const count = await db.$count(submissions);

  return (
    <PageTransition>
      <div className="flex flex-col justify-around items-center h-svh">
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
                    maxLength={32}
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
                    maxLength={512}
                  />
                </div>
              </div>
            </ArtifactFormWrapper>
          </CardContent>
          <CardFooter className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>โดเนทลัดคิว ขั้นต่ำ 10 บาท</TooltipContent>
              </Tooltip>
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
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>ส่งเลยจัฟลูกพี่</TooltipContent>
            </Tooltip>
          </CardFooter>
        </Card>
        {sid && !q && <ClearCookie />}
      </div>
    </PageTransition>
  );
}
