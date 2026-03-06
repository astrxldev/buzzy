import { eq } from "drizzle-orm";
import { BadgeDollarSign, Download, ExternalLink } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { db } from "@/lib/db";
import {
  endgameDiscord,
  endgameSubmissions,
  endgameTypes,
} from "@/lib/db/schema";
import { CallButton, CopyButton, DebugSlipUpload, Evernight } from "./client";

export default async function AdminSubmissionView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sub] = await db
    .select()
    .from(endgameSubmissions)
    .where(eq(endgameSubmissions.id, id))
    .limit(1);
  if (!sub) notFound();
  const [user] = await db
    .select()
    .from(endgameDiscord)
    .where(eq(endgameDiscord.uid, sub.user))
    .limit(1);

  const types = await db.select().from(endgameTypes);
  const typesMap = Object.fromEntries(types.map((v) => [v.id, v.display]));

  return (
    <div className="p-2 h-full">
      <div className="flex flex-col h-full w-full gap-2">
        <div className="flex w-full justify-between gap-2">
          <Card className="w-full pb-1 rounded-md">
            <CardHeader>
              <CardTitle>
                {sub.queue}. {sub.name}
              </CardTitle>
              <CardDescription>
                Server:{" "}
                <b className="text-primary-foreground">
                  {
                    { as: "Asia", eu: "Europe", tw: "Taiwan", us: "America" }[
                      sub.server
                    ]
                  }
                </b>
                <br />
                บริการ:{" "}
                <b className="text-primary-foreground">
                  {sub.service.map((v) => typesMap[v]).join(", ")}
                </b>
              </CardDescription>
            </CardHeader>
            <CardFooter className="h-full items-end pb-5">
              <CallButton user={sub.user} />
              <CopyButton text={user.username} />
            </CardFooter>
          </Card>
          {sub.slip ? (
            <Dialog>
              <DialogTrigger asChild>
                <div className="border rounded-md w-40 relative overflow-hidden hover:opacity-100 opacity-80 transition-opacity cursor-pointer">
                  <Image
                    src={`/api/slip/${sub.slip}`}
                    alt="Slip"
                    fill
                    className="blur-md brightness-50"
                  />
                  <div className="flex flex-col justify-center items-center absolute top-0 left-0 right-0 bottom-0">
                    <ExternalLink />
                    เปิดสลิป
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="h-full max-w-dvw! flex flex-col bg-[#2225] backdrop-blur-xs">
                <DialogTitle className="h-min">สลิป</DialogTitle>
                <DialogClose asChild>
                  <div className="h-full w-full flex grow justify-center relative">
                    <Image
                      src={`/api/slip/${sub.slip}`}
                      alt="Slip"
                      fill
                      objectFit="contain"
                    />
                  </div>
                </DialogClose>
                <DialogFooter className="h-min">
                  <a
                    target="_blank"
                    href={`/api/slip/${sub.slip}`}
                    download={`${user.username}-slip.png`}
                  >
                    <Button>
                      <Download />
                      ดาวน์โหลด
                    </Button>
                  </a>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : sub.price <= 0 ? (
            <div className="flex flex-col justify-center items-center border rounded-md w-40 bg-card">
              <BadgeDollarSign />
              ฟรี
            </div>
          ) : (
            <DebugSlipUpload sid={sub.id} />
          )}
        </div>
        <div className="border rounded-md h-full overflow-hidden">
           <Evernight/>
        </div>
      </div>
    </div>
  );
}
