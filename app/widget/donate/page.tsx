"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { VersionCheck } from "@/app/client";
import { cn } from "@/lib/utils";
import { sse } from "@/lib/db/sse-endpoints";

type DonateData = {
  name: string;
  image: string;
  amount: number;
  message: string;
};

export default function () {
  const [current, setCurrent] = useState<DonateData>();
  const [mounted, setMounted] = useState(false);
  const sfx = useRef<HTMLAudioElement | null>(null);

  async function ping(data: DonateData) {
    setCurrent(data);
    const { name, amount, message } = data;
    console.log("Requesting TTS");
    const tts = new Audio(
      `/api/tts?message=${encodeURIComponent(`${name} โดเนทมา ${amount} บาท\n${message}`)}`,
    );
    tts.load();
    console.log("Waiting for response");
    const ttsAvailable = await new Promise(
      (r) => (
        (tts.onloadeddata = () => r(true)),
        (tts.onerror = () => r(false))
      ),
    );
    console.log("Transitioning in");
    setMounted(true);
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
    setTimeout(() => setMounted(false), 3000);
  }

  const { name, amount, message, image } = current ?? {};

  useEffect(() => {
    const pendingHeartbeat: Record<number, (v?: unknown) => void> = {};
    const { clean } = sse.donate.subMany({
      heartbeat: (tag) => pendingHeartbeat[tag]?.(),
      ping,
    });

    setInterval(async () => {
      const tag = Math.floor(Math.random() * 1000);
      const promise = new Promise(
        (r, j) => ((pendingHeartbeat[tag] = r), setTimeout(j, 30000)),
      );
      await fetch(`/api/donate/hb?tag=${tag}`, {
        method: "PATCH",
      }).catch(() => {});
      try {
        await promise;
        console.log("Heartbeat OK");
      } catch {
        console.error("Heartbeat timed out");
      }
    }, 10000);
    return clean;
    // ping({
    //   image: TestImage as unknown as string,
    //   name: "Gayshin",
    //   amount: 1,
    //   message: `สวัสดีครับ วันนี้เรากำลังทดสอบระบบ Text to Speech แบบ mixed language โดยประโยคนี้จะสลับระหว่างภาษาไทยและ English หลายครั้ง เพื่อดูว่า model สามารถ handle pronunciation, pacing, และ sentence transition ได้ดีแค่ไหน ตัวอย่างเช่น "The quick brown fox jumps over the lazy dog" แล้วกลับมาเป็นภาษาไทยอีกครั้ง จากนั้นปิดท้ายด้วยคำว่า thank you for listening และขอให้มีวันที่ดีครับ`,
    //   // message: "ฮีตดฮีตดฮีตดฮีตดฮีตดฮีตด",
    // });
  }, []);

  return (
    <>
      <AnimatePresence>
        {mounted && (
          <div className="flex items-center justify-center h-full">
            <div className="relative w-162.5 overflow-hidden">
              <motion.div
                className="absolute left-1/2 top-1/2 z-10 -translate-1/2"
                initial={{ top: "200%", rotateZ: "600deg" }}
                animate={{ top: "50%", rotateZ: "0deg" }}
                exit={{ opacity: 0, transition: { delay: 0, duration: 2 } }}
                transition={{ duration: 1, ease: "circOut" }}
              >
                <motion.div
                  className="min-w-32"
                  initial={{ width: "1px", padding: 0 }}
                  animate={{ width: "650px", padding: "20px" }}
                  transition={{ delay: 1, duration: 1, ease: "circOut" }}
                >
                  <Image
                    src={image ?? ""}
                    alt="User submitted image"
                    className="aspect-square size-32 shrink-0 rounded-2xl bg-black/50"
                  />
                </motion.div>
              </motion.div>
              <motion.div
                className="rounded-4xl bg-black/50 p-5 flex gap-3 max-w-162.5 h-39 overflow-hidden mx-auto"
                initial={{ width: 0, padding: 0 }}
                animate={{ width: "100%", padding: "20px" }}
                exit={{ opacity: 0, transition: { delay: 0, duration: 2 } }}
                transition={{ delay: 1, duration: 1, ease: "circOut" }}
              >
                <div className="aspect-square size-32 shrink-0 rounded-2xl" />
                <div className="flex flex-col font-semibold text-3xl min-w-0">
                  <motion.span
                    className="text-[#CB5959] whitespace-nowrap"
                    initial={{ paddingTop: "20px" }}
                    animate={{ paddingTop: 0 }}
                    transition={{ delay: 1, duration: 1, ease: "circOut" }}
                  >
                    {name} :{" "}
                    <span className="text-[#FFCC00]">โดเนทมา {amount}฿</span>
                  </motion.span>
                  <motion.span
                    className={cn(
                      "whitespace-break-spaces wrap-break-word h-20 w-full",
                      (message ?? "").length > 80
                        ? "text-xl line-clamp-3"
                        : "text-3xl line-clamp-2",
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
