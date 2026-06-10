"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { VersionCheck } from "@/app/client";
import { cn } from "@/lib/utils";
import { sse } from "@/lib/db/sse-endpoints";
import DefaultImage from "#/favicon.webp";
import { markDone, markRunning } from "./api";

type DonateData = {
  id: string;
  name: string;
  image?: string;
  amount: number;
  message: string;
};

export default function () {
  const [current, setCurrent] = useState<DonateData>();
  const [mounted, setMounted] = useState(false);
  const [failed, setFailed] = useState(0);
  const sfx = useRef<HTMLAudioElement | null>(null);
  const onQueue = useRef<string[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());

  function enqueue(data: DonateData) {
    if (!data) return;
    if (onQueue.current.includes(data.id)) return;
    onQueue.current.push(data.id);
    queue.current = queue.current.then(() => ping(data).catch(console.error));
  }

  async function ping(data: DonateData) {
    setCurrent(data);
    const { name, amount, message } = data;
    markRunning(data.id);
    console.log("Requesting TTS");
    const tts = new Audio(
      `/api/tts?message=${encodeURIComponent(`"${name} โดเนทมา ${amount} บาท.. ${message}"`)}&key=${new URLSearchParams(location.search).get("key")}`,
    );
    tts.load();
    console.log("Waiting for response");
    const ttsAvailable = await new Promise(
      (r) => (
        (tts.onloadeddata = () => r(true)),
        (tts.onerror = () => r(false)),
        // longest and most complex text takes at most a minute and a half to generate
        setTimeout(() => r(false), 120000)
      ),
    );
    if (!ttsAvailable)
      posthog.capture("donation_widget_tts_failed", { amount: data.amount });
    console.log("Transitioning in");
    setMounted(true);
    posthog.capture("donation_widget_displayed", {
      amount: data.amount,
      name_length: data.name.length,
      has_image: !!data.image,
    });
    console.log("Running SFX");
    if (sfx.current) {
      const player = sfx.current;
      player.play();
      console.log("Waiting for SFX to end");
      await new Promise((r) => (player.onended = r));
    }
    console.log("Playing TTS");
    tts.play();
    if (ttsAvailable) await new Promise((r) => (tts.onended = r));
    console.log("Done");
    markDone(data.id);
    posthog.capture("donation_widget_animation_end", {
      amount: data.amount,
      tts_available: ttsAvailable,
    });
    await new Promise((r) => setTimeout(r, 3000));
    setMounted(false);
    await new Promise((r) => setTimeout(r, 1200));
    console.log("Handing off");
    onQueue.current = onQueue.current.filter((q) => q !== data.id);
  }

  const { name, amount, message, image } = current ?? {};

  useEffect(() => {
    const pendingHeartbeat: Record<number, (v?: unknown) => void> = {};
    const { clean } = sse.donate.subMany({
      heartbeat: (tag) => pendingHeartbeat[tag]?.(),
      ping: enqueue,
      refresh: () => location.reload(),
    });
    posthog.capture("donation_widget_connected");

    const interval = setInterval(async () => {
      const tag = Math.floor(Math.random() * 1000);
      const promise = new Promise(
        (r, j) => ((pendingHeartbeat[tag] = r), setTimeout(j, 30000)),
      );
      try {
        const res = await fetch(
          `/api/donate/hb?tag=${tag}${failed > 6 ? "&resume=true" : ""}`,
          {
            method: "PATCH",
            signal: AbortSignal.timeout(15000),
          },
        ).catch(() => {});
        if (failed > 6 && res)
          queueMicrotask(() => res.status === 302 && res.json().then(enqueue));
        await promise;
        console.log("Heartbeat OK");
        setFailed(0);
      } catch {
        console.error("Heartbeat timed out");
        setFailed((x) => x + 1);
        posthog.capture("donation_widget_heartbeat_failure", {
          fail_count: failed + 1,
        });
        if (failed > 12)
          fetch("/widget/donate", {
            signal: AbortSignal.timeout(30000),
            method: "HEAD",
          })
            .then(({ ok }) => {
              if (!ok) throw "NOT OK";
              location.reload();
            })
            .catch(() =>
              console.warn("Wants to reload, but not safe. Retrying later."),
            );
      }
    }, 10000);
    return () => {
      clearInterval(interval);
      clean();
    };
    // ping({
    //   name: "Gayshin",
    //   amount: 1,
    //   message: `เสื้อดำเด้าหน่อย`,
    // });
  }, [failed]);

  return (
    <>
      <AnimatePresence>
        {mounted && (
          <div className="flex h-full items-center justify-center">
            <div className="relative w-162.5 overflow-hidden">
              <motion.div
                className="absolute top-1/2 left-1/2 z-10 -translate-1/2"
                initial={{ top: "200%", rotateZ: "600deg" }}
                animate={{ top: "50%", rotateZ: "0deg" }}
                exit={{ opacity: 0, transition: { delay: 0, duration: 1 } }}
                transition={{ duration: 1, ease: "circOut" }}
              >
                <motion.div
                  className="min-w-32"
                  initial={{ width: "1px", padding: 0 }}
                  animate={{ width: "650px", padding: "20px" }}
                  transition={{ delay: 1, duration: 1, ease: "circOut" }}
                >
                  <Image
                    src={image ?? DefaultImage}
                    width={128}
                    height={128}
                    alt="User submitted image"
                    className="aspect-square size-32 shrink-0 rounded-2xl bg-black/50"
                  />
                </motion.div>
              </motion.div>
              <motion.div
                className="mx-auto flex h-39 max-w-162.5 gap-3 overflow-hidden rounded-4xl bg-black/80 p-5"
                initial={{ width: 0, padding: 0 }}
                animate={{ width: "100%", padding: "20px" }}
                exit={{ opacity: 0, transition: { delay: 0, duration: 1 } }}
                transition={{ delay: 1, duration: 1, ease: "circOut" }}
              >
                <div className="aspect-square size-32 shrink-0 rounded-2xl" />
                <div className="flex min-w-0 flex-col text-3xl font-semibold">
                  <motion.span
                    className="whitespace-nowrap text-[#CB5959]"
                    initial={{ paddingTop: "20px" }}
                    animate={{ paddingTop: 0 }}
                    transition={{ delay: 1, duration: 1, ease: "circOut" }}
                  >
                    {name} :{" "}
                    <span className="text-[#FFCC00]">โดเนทมา {amount}฿</span>
                  </motion.span>
                  <motion.span
                    className={cn(
                      "h-20 w-full wrap-break-word whitespace-break-spaces",
                      (message ?? "").length > 80
                        ? "line-clamp-3 text-xl"
                        : "line-clamp-2 text-3xl",
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                  >
                    {message}
                  </motion.span>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
      <audio src="/assets/donate-sfx.wav" ref={sfx} preload="auto" />
      <VersionCheck headless />
    </>
  );
}
