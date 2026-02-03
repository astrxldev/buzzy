/** biome-ignore-all lint/a11y/noStaticElementInteractions: Span is needed for double triggering */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: Not needed */
"use client";

import {
  ArrowBigUp,
  BookAlert,
  CircleX,
  Loader2,
  Search,
  UserSearch,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import GuideImage1 from "#/guide/1.png";
import GuideImage2 from "#/guide/2.png";
import Avatar from "@/components/avatar";
import { Blocker } from "@/components/blocker";
import { ComboBox } from "@/components/combobox";
import { SimpleTooltip } from "@/components/tooltip";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { getCharacters } from "@/lib/api";
import { shared } from "@/lib/comms";
import { uidRegex } from "@/lib/const";
import type { characters } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import type { EnkaNetworkUser } from "@/types/enka";
import { Countdown } from "../rubgram/client";
import { RulesDialog } from "./rules";

export function CharacterChooser({
  clist,
}: {
  clist: {
    value: string;
    label: string;
  }[];
}) {
  const [uid, setUid] = useState("");
  const [chars, setChars] = useState<(typeof characters.$inferSelect)[]>([]);
  const [selected, setSelected] = useState<string | undefined>();
  const [isError, setIsError] = useState<boolean | string>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [cacheTtl, setCacheTtl] = useState(new Date());

  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    async function fetchChars() {
      try {
        if (!uidRegex.test(uid)) return setChars([]);
        const res = await fetch(`/api/enka/${uid}`);
        const data:
          | (EnkaNetworkUser & { message: undefined })
          | { message: string; playerInfo: undefined } = await res
          .json()
          .catch(() => ({ message: "not json" }));
        if (data.message === "This player does not exist.")
          return setIsError("ไม่พบผู้เล่นที่มี UID นี้");
        if (!res.ok) return setIsError(true);
        if (!data.playerInfo) return setIsError(true);
        setCacheTtl(new Date(Date.now() + (data.ttl + 5) * 1000));
        if (!data.playerInfo.showAvatarInfoList)
          return setIsError("UID นี้ไม่มีตัวละครที่จัดแสดงเป็นสาธารณะ");
        const charIds = data.playerInfo.showAvatarInfoList.map((c) =>
          c.avatarId.toString(),
        );
        const chars = await getCharacters(charIds);
        setChars(
          charIds.map((e) => chars.find((c) => c.amber === e)!).filter(Boolean),
        );
        setSelected(undefined);
      } catch (e) {
        console.error(e);
        setIsError("ข้อผิดพลาดภายในระบบ");
      }
    }
    fetchChars()
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, [uid]);

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="uid">UID*</Label>
        <Input
          id="uid"
          name="uid"
          type="number"
          required
          placeholder="814006303"
          onChange={(ev) => setUid(ev.target.value)}
        />
      </div>
      <Label htmlFor="character">
        เลือกตัวละครที่ต้องการ
        {manual ? (
          <u
            className="ml-auto cursor-pointer"
            onClick={() => setManual(false)}
          >
            เลือกจากลิสต์
          </u>
        ) : (
          <span className="ml-auto">
            หาไม่เจอ?{" "}
            <u className="cursor-pointer" onClick={() => setManual(true)}>
              เลือกเอง
            </u>
          </span>
        )}
      </Label>
      {manual ? (
        <ComboBox
          placeholder="ค้นหาตัวละคร"
          id="character"
          name="character"
          data={clist}
          className="w-full bg-transparent! hover:bg-accent!"
        />
      ) : (
        <ScrollArea>
          {isError ? (
            <Placeholder className="flex-col">
              <div className="flex gap-2">
                <CircleX className="text-red-500" />{" "}
                {typeof isError === "string"
                  ? isError
                  : "เกิดข้อผิดพลาดในการดึงข้อมูล"}
              </div>
              {typeof isError === "string" && isError.startsWith("UID") && (
                <AlertDialog
                  onOpenChange={setGuideDialogOpen}
                  open={guideDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Wrench />
                      วิธีแก้ไข
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>
                      วิธีแก้ไขตัวละครไม่ขึ้น
                    </AlertDialogTitle>
                    <div className="gap-1 flex flex-col">
                      <center>
                        ในเกม เปิด<b>เมนูเกม</b>แล้วไปที่ <b>แก้ไขข้อมูลส่วนตัว</b>
                      </center>
                      <Image
                        src={GuideImage1}
                        width={500}
                        height={200}
                        alt="Guide Image 1"
                        className="border-2 border-foreground rounded-md"
                      />
                    </div>
                    <div className="gap-1 flex flex-col">
                      <center>
                        ใส่ตัวละครที่ต้องการ แล้วเปิด "<b>แสดงรายละเอียดตัวละคร</b>"
                      </center>
                      <Image
                        src={GuideImage2}
                        width={500}
                        height={200}
                        alt="Guide Image 1"
                        className="border-2 border-foreground rounded-md"
                      />
                      <span className="ml-[60%] md:ml-[65%]">
                        อย่าลืมเปิด <ArrowBigUp className="inline" />
                      </span>
                    </div>
                    <center>ออกจากเกมเพื่อให้ข้อมูลอัพเดท แล้วกดรีโหลด</center>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ปิดหน้าต่าง</AlertDialogCancel>
                      <Countdown
                        time={cacheTtl}
                        render={(s) => (
                          <Button
                            disabled={!!s || isRefreshing}
                            onClick={() => {
                              setRefreshing(true);
                              async function refreshChars() {
                                const res = await fetch(`/api/enka/${uid}`);
                                const data:
                                  | (EnkaNetworkUser & { message: undefined })
                                  | { message: string; playerInfo: undefined } =
                                  await res
                                    .json()
                                    .catch(() => ({ message: "not json" }));
                                if (
                                  data.message === "This player does not exist."
                                )
                                  return toast.error("ไม่พบผู้เล่นที่มี UID นี้");
                                if (!res.ok)
                                  return toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
                                if (!data.playerInfo)
                                  return toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
                                setCacheTtl(
                                  new Date(Date.now() + data.ttl * 1000),
                                );
                                if (!data.playerInfo.showAvatarInfoList)
                                  return toast.error(
                                    "ยังไม่พบตัวละคร ลองใหม่อีกครั้ง",
                                  );
                                const charIds =
                                  data.playerInfo.showAvatarInfoList.map((c) =>
                                    c.avatarId.toString(),
                                  );
                                const chars = await getCharacters(charIds);
                                setChars(
                                  charIds
                                    .map(
                                      (e) => chars.find((c) => c.amber === e)!,
                                    )
                                    .filter(Boolean),
                                );
                                setSelected(undefined);
                                setGuideDialogOpen(false);
                              }
                              refreshChars()
                                .catch((e) => {
                                  console.error(e);
                                  toast.error("ข้อผิดพลาดภายในระบบ");
                                })
                                .finally(() => setRefreshing(false));
                            }}
                          >
                            {isRefreshing ? <Spinner /> : <UserSearch />}
                            {s ? `รีโหลดใหม่ (${s})` : `รีโหลดใหม่`}
                          </Button>
                        )}
                      />
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </Placeholder>
          ) : isLoading ? (
            <Placeholder>
              <Loader2 className="animate-spin" /> กำลังโหลดตัวละคร...
            </Placeholder>
          ) : !chars.length ? (
            <div className="flex gap-2 mb-2">
              <Placeholder />
              <Placeholder />
              <Placeholder />
              <Placeholder />
              <Placeholder />
            </div>
          ) : (
            <div className="flex gap-2 mb-2">
              <SimpleTooltip text="ค้นหาด้วยตัวเอง">
                <Placeholder
                  className="w-[76.8px] cursor-pointer rounded-sm"
                  onClick={() => setManual(true)}
                >
                  <Search />
                </Placeholder>
              </SimpleTooltip>
              {chars.map((c) => (
                <Button key={c.id} asChild onClick={() => setSelected(c.name)}>
                  <Avatar
                    scale={0.6}
                    char={c}
                    selected={selected ? selected === c.name : 0}
                  />
                </Button>
              ))}
            </div>
          )}
          <ScrollBar orientation="horizontal" />
          <input
            id="character"
            name="character"
            type="hidden"
            value={selected}
          />
        </ScrollArea>
      )}
    </>
  );
}

function Placeholder({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "w-full h-[100.8px] flex gap-2 justify-center items-center rounded-md bg-muted",
        className,
      )}
      {...props}
    ></div>
  );
}

export function Disclaimer() {
  const [agreed, setAgreed] = useState(false);
  const [updated] = shared.state("updated");

  if (agreed || updated) return;
  return (
    <Blocker>
      <RulesDialog onOpenChange={(set) => !set && setAgreed(true)}>
        <Button variant="destructive" type="button">
          <BookAlert /> อ่านกฎ
        </Button>
      </RulesDialog>
    </Blocker>
  );
}

export function ClearCookie() {
  // biome-ignore lint/suspicious/noTsIgnore: typescript issue
  // @ts-ignore
  cookieStore.delete("sid");
  return "";
}

export function WarningDialog() {
  const [_manual, _setManual] = shared.state("manual");

  shared.signal("beforeSubmit", () => {
    _manual;
  });
}
