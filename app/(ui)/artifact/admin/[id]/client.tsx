"use client";

import { Copy, CopyCheck, OctagonAlert, ScanSearch } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
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
  useEffect(() => {
    setReady(false);
    setError(false);
    setId(`${uid}/${cidAmber}`);
  }, [uid, cidAmber]);
  return (
    <div className="h-full w-full relative">
      {!ready && !error && (
        <ScanSearch className="animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 text-muted-foreground z-100" />
      )}
      {error && (
        <div className="flex flex-col items-center gap-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-100">
          <OctagonAlert className="size-8 text-red-500" />
          <span>ไม่สามารถโหลดข้อมูลตัวละคร</span>
        </div>
      )}
      <div
        className={cn("w-full h-full border-0 bg-card transition-[filter]",
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
