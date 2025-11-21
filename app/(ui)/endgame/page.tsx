import { eq } from "drizzle-orm";
import { BookAlert, CircleDollarSign, SendHorizonal } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import banner from "#/logos/artifact.webp";
import { PageTransition } from "@/app/transition";
import { Blocker } from "@/components/blocker";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { db } from "@/lib/db";
import { endgameSubmissions } from "@/lib/db/schema";
import { ClearCookie, Disclaimer } from "../artifact/client";
import { ArtifactFormWrapper } from "../artifact/form";
import { LiveButton } from "../artifact/live";
import { RulesDialog } from "../artifact/rules";
import { getEndgameConfig } from "./api";

export default async function EndgamePage() {
  const cookie = await cookies();
  const sid = cookie.get("sid");
  const [q] = sid?.value
    ? await db
        .select({ queue: endgameSubmissions.queue })
        .from(endgameSubmissions)
        .where(eq(endgameSubmissions.id, sid.value))
    : [];
  const { count, ...config } = await getEndgameConfig();

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
        {sid && !q && <ClearCookie />}
      </div>
    </PageTransition>
  );
}
