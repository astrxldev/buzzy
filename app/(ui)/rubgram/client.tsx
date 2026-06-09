"use client";

import { ArrowRight, Check, Download, LogIn, ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
import { shared } from "@/lib/comms";
import { cn } from "@/lib/utils";
import {
  calcPrice,
  cancel,
  type getDiscordSession,
  type getEndgameConfig,
  loginDiscord,
} from "./api";
import { RulesDialog } from "./rules";

export function WelcomeScreening({
  session,
}: {
  session: Awaited<ReturnType<typeof getDiscordSession>>;
}) {
  const [agreed, setAgreed] = useState(false);
  const [updated] = shared.state("updated");

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

          <span className="text-xs text-gray-600">
            กำลังล็อกอินในฐานะ <b className="text-gray-300">{session.display}</b>{" "}
            <button
              className="cursor-pointer text-gray-400 underline hover:text-gray-300"
              onClick={loginDiscord}
              type="button"
            >
              สลับบัญชี?
            </button>
          </span>
        </div>
      ) : (
        <div className="grid gap-2">
          โปรดล็อคอินผ่าน Discord เพื่อดำเนินการต่อ
          <Button
            onClick={() => {
              posthog.capture("rubgram_discord_login_initiated");
              loginDiscord();
            }}
          >
            <span className="flex w-full items-center justify-between">
              ล็อคอินผ่าน Discord
              <LogIn />
            </span>
          </Button>
        </div>
      )}
    </Blocker>
  );
}

export function ServiceSelector({
  types,
  allDiscount,
  free,
}: Awaited<ReturnType<typeof getEndgameConfig>>) {
  const [selected, setSelected] = shared.state("rubgram.services");

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
            {types.map((t) => (
              <MultiSelectItem value={t.id} key={t.id}>
                {t.display}{" "}
                <Kbd>
                  {free > 0 ? (
                    <>
                      <span className="line-through opacity-50">{t.price}</span>{" "}
                      <span className="text-emerald-500">ฟรี</span>
                    </>
                  ) : (
                    <>
                      {t.price} <span className="opacity-50">บาท</span>
                    </>
                  )}
                </Kbd>
              </MultiSelectItem>
            ))}
          </MultiSelectGroup>
        </MultiSelectContent>
      </MultiSelect>
      <span className="-mt-1 text-xs text-muted-foreground">
        เลือกทั้ง {types.length} อย่าง ลดให้ {allDiscount} บาท
      </span>
      <select
        hidden
        id="service"
        name="service"
        multiple
        value={selected}
        onChange={() => {}}
      >
        {types.map((t) => (
          <option value={t.id} key={t.id} />
        ))}
      </select>
    </div>
  );
}

export function PriceEstimation() {
  const [selected] = shared.state("rubgram.services");
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

export function Countdown({
  time,
  render = String,
  refreshWhenOver = false,
}: {
  time: Date;
  render?: (time: string | null) => ReactNode;
  refreshWhenOver?: boolean;
}) {
  const [now, setNow] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    if (!refreshWhenOver) return;
    const wait = time.getTime() - Date.now();
    if (wait < 0) return;
    const timeout = setTimeout(() => router.refresh(), wait);
    return () => clearTimeout(timeout);
  }, [time, router, refreshWhenOver]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const diff = Math.max(0, time.getTime() - now.getTime());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return render(
    diff <= 0
      ? null
      : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
  );
}

export function CancelButton({ sid }: { sid: string }) {
  const [loading, setLoading] = useState(false);
  const [, setServices] = shared.state("rubgram.services");

  return (
    <Button
      variant="destructive"
      onClick={() => {
        setLoading(true);
        posthog.capture("rubgram_cancelled", { sid });
        cancel(sid).then(() => toast.success("คิวยกเลิกแล้ว"));
        setServices([]);
      }}
      disabled={loading}
    >
      {loading && <Spinner />}ใช่
    </Button>
  );
}

export function ClearCookie() {
  try {
    // biome-ignore lint/suspicious/noTsIgnore: typescript issue
    // @ts-ignore
    cookieStore.delete("rsid");
  } catch {
    console.warn("Cannot clear rubgram cookie");
  }
  return "";
}
