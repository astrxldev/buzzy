"use client";

import {
  Copy,
  CopyCheck,
  Dock,
  ImageIcon,
  OctagonAlert,
  ScanSearch,
  SquircleDashed,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { getCardStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

export function EnkaBrowser({ sub, uid }: { sub: string; uid: string }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useWeb, setUseWeb] = useState(false);
  const [isCached, setIsCached] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: for update
  useEffect(() => {
    setReady(false);
    setError(null);
    setIsCached(true);
    getCardStatus(sub).then((s) => {
      setIsCached(s.cached);
      if (!s.cached) setError(s.error);
    });
  }, [sub, uid]);
  return (
    <div className="h-full w-full relative">
      {!ready && !error && (isCached || useWeb) && (
        <ScanSearch
          className={cn(
            "animate-pulse absolute left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 text-muted-foreground z-45",
            useWeb ? "top-[calc(50%+80px)]" : "top-1/2",
          )}
        />
      )}
      {error && (
        <div className="flex flex-col items-center gap-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
          {error.includes("ใหม่") ? (
            <SquircleDashed className="size-8 text-orange-500" />
          ) : (
            <OctagonAlert className="size-8 text-red-500" />
          )}
          <span>{error}</span>
        </div>
      )}

      {!error && !ready && !isCached && !useWeb && (
        <div
          className={cn(
            "flex flex-col items-center gap-2 absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-40",
            useWeb ? "top-[calc(50%+80px)]" : "top-1/2",
          )}
        >
          <ScanSearch className="size-8 animate-pulse" />
          <span>ยังไม่ได้เตรียมการ์ดไว้ล่วงหน้า จะใช้เวลาสักพัก</span>
        </div>
      )}

      <SimpleTooltip text={useWeb ? "สลับเป็นรูปภาพ" : "สลับเป็น Enka"}>
        <Button
          variant="outline"
          className={cn(
            "absolute left-1 z-45 bg-[#222a]! backdrop-blur-sm opacity-50 md:opacity-20 hover:opacity-100",
            useWeb ? "-bottom-19" : "bottom-1",
          )}
          size="icon"
          onClick={() => {
            setReady(false);
            setError(null);
            setUseWeb((x) => !x);
          }}
        >
          {useWeb ? <ImageIcon /> : <Dock />}
        </Button>
      </SimpleTooltip>
      {useWeb ? (
        <iframe
          src={`https://enka.network/u/${uid}`}
          className={cn(
            "w-full border-0 bg-card -mt-20 h-[calc(100%+5rem)]",
            !ready && "grayscale blur-md brightness-50 pointer-events-none",
          )}
          title="Enka Network"
          onLoad={() => setReady(true)}
        />
      ) : (
        <div
          className={cn(
            "w-full h-full border-0 bg-card transition-[filter] portrait:rotate-90 portrait:scale-175",
            (!ready || error) &&
              "grayscale blur-md brightness-50 pointer-events-none",
          )}
        >
          <Image
            src={`/api/card/${sub}`}
            alt={`Enka card for ${sub}`}
            fill
            objectFit="contain"
            title="Enka Network"
            onLoad={() => {
              setReady(true);
              setError(null);
            }}
            onError={() => error || setError("ไม่สามารถโหลดข้อมูลตัวละคร")}
          />
        </div>
      )}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (copied) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button variant="ghost" size="icon" onClick={copy} disabled={copied}>
      {copied ? <CopyCheck /> : <Copy />}
    </Button>
  );
}
