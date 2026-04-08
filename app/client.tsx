"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { use, useEffect, useRef, useState } from "react";
import { useKey } from "react-use";
import { toast } from "sonner";
import { stringify } from "yaml";
import { CdnChooserProvider } from "@/components/chooser";
import IccProvider, { IccContext, shared } from "@/lib/comms";
import { sse } from "@/lib/db/sse-endpoints";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProgressProvider
      height="2px"
      color="var(--primary)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      <CdnChooserProvider>
        <IccProvider>{children}</IccProvider>
      </CdnChooserProvider>
    </ProgressProvider>
  );
}

export function VersionCheck({ headless = false }: { headless?: boolean }) {
  const ver = useRef<string>("");
  const { emit } = use(IccContext);
  const [debug, setDebug] = shared.state("debug");
  const [, setConnected] = shared.state("connected");
  const [, setUpdated] = shared.state("updated");
  const [debugData] = shared.raw();
  const [readyForUpdate, setReadyForUpdate] = useState(false);

  useKey("F2", () => {
    if (!headless) setDebug((x) => !x);
  });
  // console.log(`Debug mode ${debug ? "enabled" : "disabled"}`);

  useEffect(() => {
    if (!readyForUpdate && window.location.hash === "#update") {
      setUpdated(true);
      setTimeout(() => toast.success("คุณอยู่ในเวอร์ชั่นล่าสุดแล้ว"), 1000);
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState("", "", url);
    }

    const { clean, es } = sse.active.sub(
      "version",
      (newVersion) => {
        setConnected(true);
        emit("sync");
        const version = ver.current;
        if (!version) console.log("Client version:", newVersion);
        console.log("Server version:", newVersion);
        if (version && newVersion !== version) {
          setReadyForUpdate(true);
          window.location.hash = "#update";
          if (headless) window.location.reload();
          else
            toast("มีอัปเดตใหม่พร้อมใช้งาน", {
              description: "รีโหลดเพื่ออัปเดตเป็นเวอร์ชันล่าสุด",
              action: {
                label: "รีโหลด",
                // Do a full reload
                onClick: () => window.location.reload(),
              },
              duration: Infinity,
            });
        }
        if (newVersion !== version) ver.current = newVersion;
      },
      {
        endpoint: "/api/active",
        onerror() {
          setConnected(false);
          toast.promise(
            new Promise((r) => {
              es.onopen = r;
            }),
            {
              loading: "กำลังพยายามเชื่อมต่อใหม่...",
              success: () => "เชื่อมต่อสำเร็จ",
              duration: 500,
            },
          );
        },
      },
    );
    return clean;
  }, [headless, setConnected, setUpdated, readyForUpdate, emit]);

  return debug ? (
    <div className="absolute bottom-0 right-0 m-2 px-1 rounded flex flex-col gap-2 bg-card border active:pointer-events-none opacity-20 hover:opacity-100 transition-opacity">
      Buzz ({ver.current.split("-")[0] || "..."})
      <pre>{stringify(debugData, null, 2)}</pre>
    </div>
  ) : (
    ""
  );
}
