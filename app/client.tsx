"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { useEffect, useRef, useState } from "react";
import { useKey } from "react-use";
import ReconnectingEventSource from "reconnecting-eventsource";
import { toast } from "sonner";
import { stringify } from "yaml";
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

export function VersionCheck({ headless = false }: { headless?: boolean }) {
  const ver = useRef<string>("");
  const [debug, setDebug] = comms.var("debug");
  const [, setConnected] = comms.var("connected");
  const [, setUpdated] = comms.var("updated");
  const [debugData] = comms.raw();
  const [readyForUpdate, setReadyForUpdate] = useState(false);

  useKey("F2", () => {
    if (!headless) setDebug((x) => !x);
  });
  // console.log(`Debug mode ${debug ? "enabled" : "disabled"}`);

  useEffect(() => {
    if (!readyForUpdate && window.location.hash === "#update") {
      setUpdated(true);
      toast.success("คุณอยู่ในเวอร์ชั่นล่าสุดแล้ว");
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState("", "", url);
    }

    const es = new ReconnectingEventSource(`/api/active`, {});
    es.addEventListener("version", (d) => {
      setConnected(true);
      const newVersion = JSON.parse(d.data);
      const version = ver.current;
      if (!version) console.log("Client version:", newVersion);
      console.log("Server version:", newVersion);
      if (version && newVersion !== version) {
        setReadyForUpdate(true);
        window.location.hash = "#update";
        if (headless) window.location.reload();
        else
          toast("มีอัปเดตใหม่พร้อมใช้งาน", {
            description: "กดรีโหลดเพื่ออัปเดตเวอร์ชันล่าสุด",
            action: {
              label: "รีโหลด",
              // Do a full reload
              onClick: () => window.location.reload(),
            },
            duration: Infinity,
          });
      }
      if (newVersion !== version) ver.current = newVersion;
    });
    es.onerror = () => {
      setConnected(false);
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
    };
    return () => es.close();
  }, [headless, setConnected, setUpdated, readyForUpdate]);

  return debug ? (
    <div className="absolute bottom-0 right-0 m-2 px-1 rounded flex flex-col gap-2 bg-card border active:pointer-events-none opacity-20 hover:opacity-100 transition-opacity">
      Buzz ({ver.current.split("-")[0] || "..."})
      <pre>{stringify(debugData, null, 2)}</pre>
    </div>
  ) : (
    ""
  );
}
