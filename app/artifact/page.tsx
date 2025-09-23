import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { BookAlert, CircleDollarSign, SendHorizonal } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import banner from "#/logos/artifact.webp";
import { Blocker } from "@/components/blocker";
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
import { CharacterChooser } from "./chooser";
import { LiveButton } from "./live";

export default async function ArtifactFormPage() {
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
          <form>
            <div className="flex flex-col gap-3">
              <Blocker>
                <Button variant="destructive" type="button">
                  <BookAlert /> อ่านกฎ
                </Button>
              </Blocker>
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
              <CharacterChooser />
              <div className="grid gap-2">
                <Label htmlFor="comment">ข้อความเพิ่มเติม</Label>
                <Textarea id="comment" required placeholder="(ไม่บังคับ)" />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" type="button">
                  <CircleDollarSign />
                </Button>
              </TooltipTrigger>
              <TooltipContent>โดเนทลัดคิว ขั้นต่ำ 10 บาท</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" type="button">
                  <BookAlert />
                </Button>
              </TooltipTrigger>
              <TooltipContent>อ่านกฎการลงทะเบียน</TooltipContent>
            </Tooltip>
            <Suspense>
              <LiveButton />
            </Suspense>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="submit">
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
