"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { useEffect, useState } from "react";
import { useKey } from "react-use";
import ReconnectingEventSource from "reconnecting-eventsource";
import { toast } from "sonner";
import CommsProvider, { comms } from "@/lib/comms";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProgressProvider
      height="2px"
      color="var(--primary)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      <CommsProvider>{children}</CommsProvider>
    </ProgressProvider>
  );
}

export function VersionCheck() {
  const [version, setVersion] = useState<string>();
  const [count, setCount] = useState<string | number>("...");
  const [debug, setDebug] = comms.var("debug");

  useKey("f2", () => setDebug(!debug));

  useEffect(() => {
    const es = new ReconnectingEventSource(`/api/active`, {});
    es.addEventListener("version", (d) => {
      const newVersion = JSON.parse(d.data);
      if (!version) console.log("Client version:", newVersion);
      console.log("Server version:", newVersion);
      if (version && newVersion !== version)
        toast("เวอร์ชั่นใหม่ออกแล้ว", {
          description: "โปรดรีโหลดเพื่อใช้งานต่อ",
          action: {
            label: "Reload",
            // Do a full reload
            onClick: () => window.location.reload(),
          },
          duration: Infinity,
        });
      if (newVersion !== version) setVersion(newVersion);
    });
    es.addEventListener("count", (d) => {
      const count = JSON.parse(d.data);
      setCount(count);
    });
    es.onerror = () =>
      toast.promise(
        new Promise((r) => {
          es.onopen = r;
        }),
        {
          loading: "กำลังพยายามเชื่อมต่อใหม่...",
          success: () => "เชื่อมต่อแล้ว",
          duration: 500,
        },
      );
    return () => es.close();
  }, [version]);

  return debug ? (
    <div className="absolute bottom-0 right-0 m-2 px-1 rounded flex gap-2 bg-card border active:pointer-events-none opacity-20 hover:opacity-100 transition-opacity">
      {count} ผู้ใช้งานออนไลน์
    </div>
  ) : (
    ""
  );
}
