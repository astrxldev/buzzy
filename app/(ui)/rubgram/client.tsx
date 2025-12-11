"use client";

import { ArrowRight, Check, Download, LogIn, ScrollText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Blocker } from "@/components/blocker";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { Spinner } from "@/components/ui/spinner";
import { comms } from "@/lib/comms";
import { cn } from "@/lib/utils";
import { calcPrice, cancel, type getDiscordSession, loginDiscord } from "./api";
import { RulesDialog } from "./rules";

export function WelcomeScreening({
  session,
}: {
  session: Awaited<ReturnType<typeof getDiscordSession>>;
}) {
  const [agreed, setAgreed] = useState(false);
  const [updated] = comms.var("updated");

  if (agreed || (updated && session)) return;
  return (
    <Blocker>
      {session ? (
        <div className="grid gap-2">
          <RulesDialog onOpenChange={(set) => !set && setAgreed(true)}>
            <Button type="button">
              ดำเนินการต่อ <ArrowRight />
            </Button>
          </RulesDialog>

          <span className="text-gray-600 text-xs">
            กำลังล็อกอินในฐานะ <b className="text-gray-300">{session.display}</b>{" "}
            <button
              className="text-gray-400 hover:text-gray-300 underline cursor-pointer"
              onClick={loginDiscord}
              type="button"
            >
              สลับบัญชี?
            </button>
          </span>
        </div>
      ) : (
        <div className="grid gap-2">
          โปรดล็อคอินด้วย Discord เพื่อดำเนินการต่อ
          <Button onClick={loginDiscord}>
            <span className="flex justify-between w-full items-center">
              Login ด้วย Discord
              <LogIn />
            </span>
          </Button>
        </div>
      )}
    </Blocker>
  );
}

export function ServiceSelector() {
  const [selected, setSelected] = comms.var("rubgram.services");

  return (
    <div className="grid gap-2">
      <Label htmlFor="service">บริการ*</Label>
      <MultiSelect
        onValuesChange={(l) =>
          setSelected(l as unknown as Parameters<typeof setSelected>[0])
        }
      >
        <MultiSelectTrigger className="w-full">
          <MultiSelectValue placeholder="เลือกบริการที่ต้องการ" />
        </MultiSelectTrigger>
        <MultiSelectContent search={false}>
          <MultiSelectGroup>
            <MultiSelectItem value="abyss">
              Spiral abyss <Kbd>60 บาท</Kbd>
            </MultiSelectItem>
            <MultiSelectItem value="theater">
              โรงละครในจินตนาการ <Kbd>100 บาท</Kbd>
            </MultiSelectItem>
            <MultiSelectItem value="stygian">
              Stygian onslaught <Kbd>100 บาท</Kbd>
            </MultiSelectItem>
          </MultiSelectGroup>
        </MultiSelectContent>
      </MultiSelect>
      <span className="text-xs text-muted-foreground -mt-1">
        เลือกทั้งหมด ลดให้ 10 บาท
      </span>
      <select
        hidden
        id="service"
        name="service"
        multiple
        value={selected}
        onChange={() => {}}
      >
        <option value="abyss" />
        <option value="theater" />
        <option value="stygian" />
      </select>
    </div>
  );
}

export function PriceEstimation() {
  const [selected] = comms.var("rubgram.services");
  const [label, setLabel] = useState("ทั้งหมด 0 บาท");

  useEffect(() => {
    if (selected) calcPrice(selected).then((p) => setLabel(`ทั้งหมด ${p} บาท`));
  });

  return <Kbd>{label}</Kbd>;
}

export function SlipUpload() {
  const ref = useRef<HTMLInputElement>(null);
  const [isSelected, setIsSelected] = useState(false);

  return (
    <>
      <Button
        className={cn("w-full", isSelected && "bg-emerald-600!")}
        size="sm"
        type="button"
        onClick={() => ref.current?.click()}
        variant="destructive"
      >
        {isSelected ? <Check /> : <ScrollText />} อัพโหลดสลิป
      </Button>
      <input
        ref={ref}
        type="file"
        name="slip"
        accept="image/*"
        required
        hidden
        onChange={() => setIsSelected(!!ref.current?.files?.length)}
      />
    </>
  );
}

export function DownloadButton() {
  return (
    <Button
      className="w-full"
      size="sm"
      type="button"
      onClick={() => {
        fetch("/assets/promptpay_full.jpg")
          .then((res) => res.blob())
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "qrcode.jpg";
            a.click();
            URL.revokeObjectURL(url);
          });
      }}
      variant="ghost"
    >
      <Download /> ดาวน์โหลด QR Code
    </Button>
  );
}

export function Countdown({ time }: { time: Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const diff = Math.max(0, time.getTime() - now.getTime());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return (
    <span>
      {minutes.toString().padStart(2, "0")}:
      {seconds.toString().padStart(2, "0")}
    </span>
  );
}

export function CancelButton({ sid }: { sid: string }) {
  const [loading, setLoading] = useState(false);
  const [, setServices] = comms.var("rubgram.services");

  return (
    <Button
      variant="destructive"
      onClick={() => {
        setLoading(true);
        cancel(sid).then(() => toast.success("คิวยกเลิกแล้ว"));
        setServices([]);
      }}
      disabled={loading}
    >
      {loading && <Spinner />}ยกเลิก
    </Button>
  );
}

export function ClearCookie() {
  // biome-ignore lint/suspicious/noTsIgnore: typescript issue
  // @ts-ignore
  cookieStore.delete("rsid");
  return "";
}
