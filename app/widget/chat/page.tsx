"use client";

import { Countdown } from "@/app/(ui)/rubgram/client";
import type { YoutubeLiveInfo } from "@/app/api/live/route";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { throwNotOk } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MessageCircleOff } from "lucide-react";

export default function ChatWidget() {
  const [cooldown, setCooldown] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // post prevents caching
      const data: YoutubeLiveInfo = await fetch("/api/live", { method: "POST" })
        .then(throwNotOk)
        .then((r) => r.json());
      if (data === "none") return setNotFound(true);
      const vid = new URL(data.url).searchParams.get("v");
      router.push(`https://studio.youtube.com/live_chat?is_popout=1&v=${vid}`);
    } catch (e) {
      console.error(e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!notFound) load();
  }, [load, notFound]);

  return notFound ? (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 rounded-xl border bg-zinc-800/50 text-4xl">
      <MessageCircleOff size={64} className="opacity-50" />
      <Button
        onClick={() => {
          load().finally(() => setCooldown(new Date(Date.now() + 60_000)));
        }}
        size="lg"
        disabled={!!cooldown || loading}
      >
        {loading ? <Spinner /> : <RefreshCw />}
        {cooldown ? <Countdown time={cooldown} /> : "รีโหลดใหม่"}
      </Button>
    </div>
  ) : (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner />
    </div>
  );
}
