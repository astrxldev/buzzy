"use client";

import { sse } from "@/lib/db/sse-endpoints";
import { useEffect, useRef, useState } from "react";
import { getTopDonate } from "./api";

type Data = Awaited<ReturnType<typeof getTopDonate>>;

export default function TopDonateWidget() {
  const [top, setTop] = useState<Data>();
  const textRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function update() {
      void getTopDonate().then(setTop);
    }
    queueMicrotask(update);
    return sse.donate.subMany({
      update,
      ping: update,
      refresh: () => location.reload(),
    }).clean;
  }, []);

  // the most idiomatic way possible but it works
  useEffect(() => {
    if (!textRef.current) return;
    var fontSize = 48,
      count = 0;
    const el = textRef.current;
    const interval = setInterval(() => {
      console.log(el.scrollWidth, el.clientWidth);
      fontSize = (fontSize * el.clientWidth) / el.scrollWidth;
      el.style.fontSize = `${fontSize}px`;
      count++;
      if (count > 20) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [textRef, top]);
  return top ? (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_max-content] w-94.5 max-w-94.5 h-18.75 *:self-center gap-1 text-5xl font-semibold bg-black/75 rounded-full p-2 px-3 text-[#FFBA00] border-4 border-white">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="24px"
        viewBox="0 -960 960 960"
        width="24px"
        fill="currentColor"
        className="size-10 shrink-0"
      >
        <path d="M200-160v-80h560v80H200Zm0-140-51-321q-2 0-4.5.5t-4.5.5q-25 0-42.5-17.5T80-680q0-25 17.5-42.5T140-740q25 0 42.5 17.5T200-680q0 7-1.5 13t-3.5 11l125 56 125-171q-11-8-18-21t-7-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820q0 15-7 28t-18 21l125 171 125-56q-2-5-3.5-11t-1.5-13q0-25 17.5-42.5T820-740q25 0 42.5 17.5T880-680q0 25-17.5 42.5T820-620q-2 0-4.5-.5t-4.5-.5l-51 321H200Zm68-80h424l26-167-105 46-133-183-133 183-105-46 26 167Zm212 0Z" />
      </svg>
      <div ref={textRef} className="min-w-0">
        {top.name}
      </div>
      <div className="text-white">{top.amount}฿</div>
    </div>
  ) : (
    ""
  );
}
