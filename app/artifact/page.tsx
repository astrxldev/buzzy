import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { BookAlert, CircleDollarSign, SendHorizonal } from "lucide-react";
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
import { getArtifactConfig, submitArtifact } from "@/lib/api";
import { db } from "@/lib/db";
import { characters, submissions } from "@/lib/db/schema";
import { CharacterChooser, Disclaimer } from "./client";
import { LiveButton } from "./live";
import { RulesDialog } from "./rules";

export default async function ArtifactFormPage() {
  const config = await getArtifactConfig();
  const count = await db.$count(submissions);

  return (
    <div className="flex flex-col justify-around items-center h-full">
      <Card className="w-full max-w-md">
        <CardHeader className="justify-center">
          <CardTitle>
            <div className="w-[276.5px]">
              <Image
                style={{ position: "absolute", transform: "translateY(-70%)" }}
                height={137.5}
                width={276.5}
                src={banner}
                alt="เสือกไอดีชาวบ้าน"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitArtifact} id="mainform">
            <div className="flex flex-col gap-3">
              {config.locked ? (
                <Blocker>
                  <span className="font-bold text-3xl">ขณะนี้ปิดรับอยู่</span>
                </Blocker>
              ) : config.limit >= 0 && count >= config.limit ? (
                <Blocker>
                  <div className="flex gap-1 flex-col items-center">
                    <span className="font-bold text-3xl">ขณะนี้คิวเต็มแล้ว</span>
                    <span className="font-bold text-2xl">
                      ต้องโดเนทลัดคิวแล้วล่ะ
                    </span>
                  </div>
                </Blocker>
              ) : (
                <Disclaimer />
              )}
              <div className="grid gap-2">
                <Label htmlFor="name">ชื่อ</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Mr. Buzz"
                  autoComplete="name"
                  required
                />
              </div>
              {config.enka ? (
                <CharacterChooser />
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="password">UID</Label>
                    <Input
                      id="password"
                      type="number"
                      required
                      placeholder="887654321"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="character">ตัวละคร</Label>
                    <ComboBox
                      placeholder="ค้นหาตัวละคร"
                      data={
                        await db
                          .select({
                            label: characters.name,
                            value: characters.name,
                          })
                          .from(characters)
                      }
                      className="w-full"
                    />
                  </div>
                </>
              )}
              <div className="grid gap-2">
                <Label htmlFor="comment">ข้อความเพิ่มเติม</Label>
                <Textarea
                  id="comment"
                  required
                  placeholder="(ไม่บังคับ)"
                  className="bg-card"
                />
              </div>
            </div>
          </form>
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
              <Button type="submit" form="mainform">
                <SendHorizonal />
              </Button>
            </TooltipTrigger>
            <TooltipContent>ส่งเลยคับพี่</TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>
    </div>
  );
}
