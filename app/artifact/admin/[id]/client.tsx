"use client";

import { Copy, CopyCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EnkaBrowser({ uid }: { uid: string }) {
  const [id, setId] = useState(uid);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setId(uid);
    setReady(false);
  }, [uid]);
  return (
    <div className="h-full w-full relative">
      {!ready && (
        <Loader2 className="animate-spin absolute top-[calc(50%+5rem] left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 text-muted-foreground z-100" />
      )}
      <iframe
        src={`https://enka.network/u/${id}`}
        className={cn(
          "w-full border-0 bg-card -mt-20 h-[calc(100%+5rem)]",
          !ready && "grayscale blur-md brightness-50 pointer-events-none",
        )}
        title="Enka Network"
        onLoad={() => setReady(true)}
      />
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
