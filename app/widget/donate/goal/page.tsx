"use client";

import { sse } from "@/lib/db/sse-endpoints";
import { useEffect, useRef, useState } from "react";
import { getDonateBar } from "./api";

type Data = Awaited<ReturnType<typeof getDonateBar>>;

export default function TopDonateWidget() {
  const [bar, setBar] = useState<Data>();
  const textRef = useRef<HTMLDivElement | null>(null);
  const stableSize = useRef<Record<string, number>>({});
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    async function update() {
      void getDonateBar().then(setBar);
    }
    queueMicrotask(update);
    const { clean } = sse.donate.subMany({
      update,
      ping: update,
      refresh: () => location.reload(),
    });

    setInterval(update, 300000);

    return () => {
      clean();
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
      key = `${bar?.goal}${bar?.amount}`;
    if (stableSize.current[key]) {
      el.style.fontSize = `${stableSize.current[key]}px`;
      return;
    }
    const interval = setInterval(() => {
      console.log(el.scrollHeight, parent.clientHeight);
      fontSize = (fontSize * parent.clientHeight) / el.scrollHeight;
      el.style.fontSize = `${fontSize}px`;
      count++;
      if (count > 20) {
        stableSize.current[key] = fontSize;
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [bar, resizeTick]);

  useEffect(() => {
    const onResize = () => {
      const key = `${bar?.goal}${bar?.amount}`;
      delete stableSize.current[key];
      setResizeTick((t) => t + 1);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bar]);

  return bar && bar.amount !== null && bar.goal ? (
    <div className="relative h-full w-full rounded-full bg-[#252525]">
      <div className="absolute inset-2 rounded-full bg-black" />
      <div
        className="absolute inset-1.5 rounded-full bg-linear-to-b from-[#FD0000] to-[#830000]"
        style={{
          right: `${100 - Math.min(1, Number(bar.amount) / bar.goal) * 100}%`,
        }}
      />
      <div
        ref={textRef}
        className="absolute top-1/2 right-8 -translate-y-1/2 pb-1 font-bold"
      >
        {bar.goal}฿
      </div>
    </div>
  ) : (
    ""
  );
}
