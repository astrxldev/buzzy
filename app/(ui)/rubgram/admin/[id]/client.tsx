"use client";

import {
  Check,
  Copy,
  CopyCheck,
  ImageOff,
  Loader2,
  MessageSquareWarning,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { debugUploadSlip, discordCall } from "../../api";

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
        <Loader2 className="animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 text-muted-foreground z-100" />
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
    <Button
      variant="link"
      onClick={copy}
      disabled={copied}
      className="text-white"
    >
      {copied ? <CopyCheck /> : <Copy />} คัดลอก username
    </Button>
  );
}

export function CallButton({ user }: { user: string }) {
  const [state, setState] = useState<"ready" | "loading" | "success" | "error">(
    "ready",
  );
  return (
    <Button
      disabled={state === "loading"}
      onClick={() => {
        setState("loading");
        discordCall(user).then((r) => setState(r ? "success" : "error"));
      }}
      variant={
        state === "error"
          ? "destructive"
          : state === "success"
            ? "secondary"
            : "default"
      }
    >
      {state === "success" ? (
        <Check />
      ) : state === "loading" ? (
        <Spinner />
      ) : (
        <MessageSquareWarning />
      )}
      กดเรียกผ่านดิสคอร์ด
    </Button>
  );
}

export function DebugSlipUpload({ sid }: { sid: string }) {
  const ref = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <button
        className="flex flex-col justify-center items-center border rounded-md w-40 bg-card cursor-pointer"
        onClick={() => ref.current?.click()}
        type="button"
      >
        <ImageOff />
        ยังไม่จ่าย
        <span className="text-xs">กดเพื่ออัพสลิป</span>
      </button>
      <input
        ref={ref}
        hidden
        type="file"
        accept="image/*"
        onChange={(ev) => {
          if (ev.target.files?.length)
            debugUploadSlip(sid, ev.target.files.item(0)!);
        }}
      />
    </>
  );
}
