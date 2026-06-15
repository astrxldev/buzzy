"use client";

import { sse } from "@/lib/db/sse-endpoints";
import { useEffect, useRef, useState } from "react";
import { getDonateBar } from "./api";
import { motion } from "motion/react";
import { pausePass } from "@/lib/utils";

type Data = Awaited<ReturnType<typeof getDonateBar>>;

export default function TopDonateWidget() {
  const [bar, setBar] = useState<Data>();
  const textRef = useRef<HTMLDivElement | null>(null);
  const stableSize = useRef<Record<string, number>>({});
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    async function update() {
      if (textRef.current)
        void getDonateBar().then(pausePass(10000)).then(setBar);
      else void getDonateBar().then(setBar);
    }
    queueMicrotask(update);
    const { clean } = sse.donate.subMany({
      update,
      ping: update,
      refresh: () => location.reload(),
    });

    const backupInterval = setInterval(update, 300000);

    return () => {
      clean();
      clearInterval(backupInterval);
    };
  }, []);

  // the most idiomatic way possible but it works
  useEffect(() => {
    // oxlint-disable-next-line no-unused-expressions
    resizeTick; // trigger re-run on window resize
    if (!textRef.current) return;
    var fontSize = 48,
      count = 0;
    const el = textRef.current,
      parent = el.parentElement!,
      key = `${bar?.goal}`;
    if (stableSize.current[key]) {
      el.classList.add("opacity-100");
      el.style.fontSize = `${stableSize.current[key]}px`;
      return;
    }
    el.classList.remove("opacity-100");
    const interval = setInterval(() => {
      console.log(el.scrollHeight, parent.clientHeight);
      fontSize = (fontSize * parent.clientHeight) / el.scrollHeight;
      el.style.fontSize = `${fontSize}px`;
      count++;
      if (count > 10) {
        stableSize.current[key] = fontSize;
        el.classList.add("opacity-100");
        clearInterval(interval);
      }
    }, 100);
    return () => {
      el.classList.add("opacity-100");
      clearInterval(interval);
    };
  }, [bar, resizeTick]);

  useEffect(() => {
    const onResize = () => {
      stableSize.current = {};
      setResizeTick((t) => t + 1);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bar]);

  return bar ? (
    <div className="relative h-full max-h-[20svw] w-full rounded-full bg-[#252525]">
      <div className="absolute inset-2 rounded-full bg-black" />
      <motion.div
        className="absolute inset-1.5 rounded-full bg-linear-to-b from-[#FD0000] to-[#830000]"
        animate={{
          width: `calc(${Math.min(1, Number(bar.amount ?? "0") / (bar.goal ?? 1)) * 100}% - ${Math.min(1, Number(bar.amount ?? "0") / (bar.goal ?? 1)) * 12}px)`,
          // width: `calc(6px + ${Math.min(1, Number(bar.amount) / bar.goal)} * (100% - 12px))`,
        }}
        initial={{
          width: 0,
        }}
      />
      <div
        ref={textRef}
        className="absolute top-1/2 right-8 -translate-y-1/2 pb-1 font-bold opacity-0 transition-opacity"
      >
        {bar.goal}฿
      </div>
    </div>
  ) : (
    ""
  );
}
