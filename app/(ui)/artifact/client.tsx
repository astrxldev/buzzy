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
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import GuideImage1 from "#/guide/1.png";
import GuideImage2 from "#/guide/2.png";
import Avatar from "@/components/avatar";
import { Blocker } from "@/components/blocker";
import { ComboBox } from "@/components/combobox";
import { HorizontalDiv } from "@/components/horizontal";
import { SimpleTooltip } from "@/components/tooltip";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { getCharacters } from "@/lib/api";
import { IccContext, shared } from "@/lib/comms";
import { uidRegex } from "@/lib/const";
import type { characters } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import type { EnkaNetworkUser } from "@/types/enka";
import { Countdown } from "../rubgram/client";
import { RulesDialog } from "./rules";

export function CharacterChooser({
  clist,
  uid: defaultUid = "",
  char: defaultChar,
}: {
  clist: {
    value: string;
    label: string;
  }[];
  uid?: string;
  char?: string;
}) {
  const [uid, setUid] = useState(defaultUid);
  const [chars, setChars] = useState<(typeof characters.$inferSelect)[]>([]);
  const [selected, setSelected] = useState<string | undefined>(defaultChar);
  const [isError, setIsError] = useState<boolean | string>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [, setWarningUid] = shared.state("warning.uid");
  const [, setWarningSrc] = shared.state("warning.src");
  const [, setWarning] = shared.state("warning");

  useEffect(() => {
    if (defaultUid) setUid(defaultUid);
  }, [defaultUid]);

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

        if (!data.playerInfo.showAvatarInfoList)
          return setIsError("UID นี้ไม่มีตัวละครที่จัดแสดงเป็นสาธารณะ");
        const charIds = data.playerInfo.showAvatarInfoList.map((c) =>
          c.avatarId.toString(),
        );
        const chars = await getCharacters(charIds);
        const userChars = charIds
          .map((e) => chars.find((c) => c.amber === e)!)
          .filter(Boolean);
        setChars(userChars);
        setSelected(
          userChars.some((c) => c.name === defaultChar)
            ? defaultChar
            : undefined,
        );
      } catch (e) {
        console.error(e);
        setIsError("ข้อผิดพลาดภายในระบบ");
      }
    }
    fetchChars()
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, [uid, defaultChar]);

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
          defaultValue={defaultUid}
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
        <HorizontalDiv magnitude={2}>
          {isError ? (
            <Placeholder className="flex-col">
              <div className="flex gap-2">
                <CircleX className="text-red-500" />{" "}
                {typeof isError === "string"
                  ? isError
                  : "เกิดข้อผิดพลาดในการดึงข้อมูล"}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setWarningUid(uid);
                  setWarningSrc("input");
                  setWarning("guide");
                }}
              >
                <Wrench />
                วิธีแก้ไข
              </Button>
            </Placeholder>
          ) : isLoading ? (
            <Placeholder>
              <Loader2 className="animate-spin" /> กำลังโหลดตัวละคร...
            </Placeholder>
          ) : !chars.length ? (
            <div className="mb-2 flex gap-2">
              <Placeholder />
              <Placeholder />
              <Placeholder />
              <Placeholder />
              <Placeholder />
            </div>
          ) : (
            <div className="mb-2 flex gap-2">
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
        </HorizontalDiv>
      )}
    </>
  );
}

function Placeholder({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex h-[100.8px] w-full items-center justify-center gap-2 rounded-md bg-muted",
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

  try {
    cookieStore.delete("sid");
  } catch {
    // not in browser(im too lazy to check)
  }
  return "";
}

export function WarningDialog() {
  const [warning, setWarning] = shared.state("warning");
  const [uid] = shared.state("warning.uid");

  const [open, setOpen] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [cacheTtl, setCacheTtl] = useState(new Date());
  const icc = use(IccContext);

  // 👀 open when warning === "guide"
  useEffect(() => {
    setOpen(warning === "guide");
  }, [warning]);

  async function refreshChars() {
    if (!uid) return;

    setRefreshing(true);

    try {
      const res = await fetch(`/api/enka/${uid}`);
      const data:
        | (EnkaNetworkUser & { message: undefined })
        | { message: string; playerInfo: undefined } = await res
        .json()
        .catch(() => ({ message: "not json" }));

      if (data.message === "This player does not exist.")
        return toast.error("ไม่พบผู้เล่นที่มี UID นี้");

      if (!res.ok || !data.playerInfo)
        return toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");

      setCacheTtl(new Date(Date.now() + data.ttl * 1000));

      if (!data.playerInfo.showAvatarInfoList)
        return toast.error("ยังไม่พบตัวละคร ลองใหม่อีกครั้ง");

      const charIds = data.playerInfo.showAvatarInfoList.map((c) =>
        c.avatarId.toString(),
      );

      await getCharacters(charIds); // warm cache / ensure available

      // ✅ success → close dialog + notify
      setWarning(undefined);
      icc.emit("warningSolved");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("ข้อผิดพลาดภายในระบบ");
    } finally {
      setRefreshing(false);
    }
  }

  if (warning === "nf")
    return (
      <AlertDialog onOpenChange={() => setWarning(undefined)} open>
        <AlertDialogContent>
          <AlertDialogTitle>เดี๋ยวนะ</AlertDialogTitle>
          UID นี้ไม่มีอยู่จริง แน่เหรอว่าจะส่ง?
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>

            <Button
              variant="destructive"
              onClick={() => {
                setWarning(undefined);
                icc.emit("warningSolved");
              }}
            >
              ยังไงก็จะส่ง
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  if (warning === "showcase")
    return (
      <AlertDialog onOpenChange={() => setWarning(undefined)} open>
        <AlertDialogContent>
          <AlertDialogTitle>เดี๋ยวนะ</AlertDialogTitle>
          ตัวละครที่เลือกไม่ได้อยู่ในตั้งโชว์
          <br />
          ถ้าส่งก่อนใส่มันจะไม่ขึ้นนะ ไปแก้ก่อนมั้ย
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>

            <Button
              variant="destructive"
              onClick={() => {
                setWarning(undefined);
                icc.emit("warningSolved");
              }}
            >
              ยังไงก็จะส่ง
            </Button>
            <Button onClick={() => setWarning("guide")}>
              <Wrench />
              วิธีแก้
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  if (warning === "private")
    return (
      <AlertDialog onOpenChange={() => setWarning(undefined)} open>
        <AlertDialogContent>
          <AlertDialogTitle>เดี๋ยวนะ</AlertDialogTitle>
          ใน UID นี้ไม่มีตัวละครอะไรตั้งโชว์อยู่เลย
          <br />
          ถ้าส่งก่อนใส่มันจะไม่ขึ้นนะ ไปแก้ก่อนมั้ย
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>

            <Button
              variant="destructive"
              onClick={() => {
                setWarning(undefined);
                icc.emit("warningSolved");
              }}
            >
              ยังไงก็จะส่ง
            </Button>
            <Button onClick={() => setWarning("guide")}>
              <Wrench />
              วิธีแก้
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  if (!warning) return null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setWarning(undefined);
      }}
    >
      <AlertDialogContent>
        <AlertDialogTitle>วิธีแก้ไขตัวละครไม่ขึ้น</AlertDialogTitle>

        <div className="flex flex-col gap-2">
          <center>
            ในเกม เปิด<b>เมนูเกม</b>แล้วไปที่ <b>แก้ไขข้อมูลส่วนตัว</b>
          </center>

          <Image
            src={GuideImage1}
            width={500}
            height={200}
            alt="Guide Image 1"
            className="rounded-md border-2 border-foreground"
          />

          <center>
            ใส่ตัวละครที่ต้องการ แล้วเปิด "<b>แสดงรายละเอียดตัวละคร</b>"
          </center>

          <Image
            src={GuideImage2}
            width={500}
            height={200}
            alt="Guide Image 2"
            className="rounded-md border-2 border-foreground"
          />

          <span className="ml-[60%] md:ml-[65%]">
            อย่าลืมเปิด <ArrowBigUp className="inline" />
          </span>

          <center>ออกจากเกมเพื่อให้ข้อมูลอัพเดท แล้วกดรีโหลด</center>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>ปิดหน้าต่าง</AlertDialogCancel>

          <Countdown
            time={cacheTtl}
            render={(s) => (
              <Button disabled={!!s || isRefreshing} onClick={refreshChars}>
                {isRefreshing ? <Spinner /> : <UserSearch />}
                {s ? `รีโหลดใหม่ (${s})` : `รีโหลดใหม่`}
              </Button>
            )}
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
