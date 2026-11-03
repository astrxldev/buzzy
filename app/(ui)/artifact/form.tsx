"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { checkEnkaStatus, submitArtifact } from "@/lib/api";
import { shared } from "@/lib/comms";
import type { ActionSubmitContextData } from "@/components/action-submit-provider";
import { ActionSubmitContext } from "@/components/action-submit-provider";

export function ArtifactFormWrapper({
  edit,
  enka,
  ...props
}: React.ComponentProps<"form"> & {
  edit?: { sub: string; token: string };
  enka: boolean;
}) {
  const router = useRouter();
  const [, setDialog] = shared.state("warning");
  const [, setWarningUid] = shared.state("warning.uid");
  const [warningSrc, setWarningSrc] = shared.state("warning.src");
  const [dataHold, setDataHold] = useState<FormData>();
  const callback = useRef<(success?: boolean) => void>(() => {});
  const context: ActionSubmitContextData = {
    listenForComplete(complete) {
      callback.current = complete;
    },
  };

  // Disable warning for 60 seconds
  shared.signal(
    "warningSolved",
    () => dataHold && warningSrc === "submit" && submit(dataHold, false),
  );

  async function submit(data: FormData, doCheck = true): Promise<boolean> {
    const props = {
      character: data.get("character")?.toString(),
      is_edit: !!edit,
    };
    if (enka && doCheck) {
      let check: Awaited<ReturnType<typeof checkEnkaStatus>>;
      try {
        check = await checkEnkaStatus(
          (data.get("uid") ?? "").toString(),
          (data.get("character") ?? "").toString(),
        );
      } catch (e) {
        console.error(e);
        posthog.captureException(e, { action: "checkEnkaStatus" });
        posthog.capture("artifact_submit_failed", {
          ...props,
          stage: "enka_check",
          reason: "error",
        });
        toast.error("ข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง");
        return false;
      }
      console.log(data.get("uid"), data.get("character"), check);
      setWarningUid(data.get("uid")?.toString());
      setWarningSrc("submit");
      setDataHold(data);
      if (check) {
        setDialog(check);
        return false;
      }
    }
    try {
      const q = await submitArtifact(data, edit);
      if (typeof q === "string") {
        posthog.capture("artifact_submit_failed", {
          ...props,
          stage: "submit",
          reason: "rejected",
        });
        toast.error(q);
        return false;
      }
      posthog.capture("artifact_submitted", props);
      try {
        // biome-ignore lint/suspicious/noTsIgnore: error appears on build but not visible to biome
        // @ts-ignore
        cookieStore.set("sid", q.id);
      } catch {}
      router.refresh();
      return true;
    } catch (e) {
      console.error(e);
      posthog.captureException(e, { action: "submitArtifact" });
      posthog.capture("artifact_submit_failed", {
        ...props,
        stage: "submit",
        reason: "error",
      });
      toast.error(`${(e as Error)?.message || e}`);
      return false;
    }
  }
  return (
    <ActionSubmitContext.Provider value={context}>
      <form
        {...props}
        onSubmit={(e) => {
          e.preventDefault();
          submit(new FormData(e.target as HTMLFormElement)).then((success) =>
            setTimeout(() => callback.current(success), 1000),
          );
        }}
      />
    </ActionSubmitContext.Provider>
  );
}
