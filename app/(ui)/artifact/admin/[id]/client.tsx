"use client";

import {
  Copy,
  CopyCheck,
  Dock,
  ImageIcon,
  OctagonAlert,
  ScanSearch,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EnkaBrowser({
  uid,
  cidAmber,
}: {
  uid: string;
  cidAmber: string;
}) {
  const [id, setId] = useState(uid);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [useWeb, setUseWeb] = useState(false);
  useEffect(() => {
    setReady(false);
    setError(false);
    setId(`${uid}/${cidAmber}`);
  }, [uid, cidAmber]);
  return (
    <div className="h-full w-full relative">
      {!ready && !error && (
        <ScanSearch
          className={cn(
            "animate-pulse absolute left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 text-muted-foreground z-100",
            useWeb ? "top-[calc(50%+80px)]" : "top-1/2",
          )}
        />
      )}
      {error && (
        <div className="flex flex-col items-center gap-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-100">
          <OctagonAlert className="size-8 text-red-500" />
          <span>ไม่สามารถโหลดข้อมูลตัวละคร</span>
        </div>
      )}
      {(ready || error) && (
        <SimpleTooltip text={useWeb ? "สลับเป็นรูปภาพ" : "สลับเป็น Enka"}>
          <Button
            variant="outline"
            className={cn(
              "absolute left-1 z-110 bg-[#222a]! backdrop-blur-sm opacity-20 hover:opacity-100",
              useWeb ? "-bottom-19" : "bottom-1",
            )}
            size="icon"
            onClick={() => {
              setReady(false);
              setError(false);
              setUseWeb((x) => !x);
            }}
          >
            {useWeb ? <ImageIcon /> : <Dock />}
          </Button>
        </SimpleTooltip>
      )}
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
            "w-full h-full border-0 bg-card transition-[filter]",
            (!ready || error) &&
              "grayscale blur-md brightness-50 pointer-events-none",
          )}
        >
          <Image
            src={`https://cards.enka.network/u/${id}/image`}
            alt={`Enka card for ${id}`}
            fill
            objectFit="contain"
            title="Enka Network"
            onLoadingComplete={() => setReady(true)}
            onError={() => setError(true)}
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
