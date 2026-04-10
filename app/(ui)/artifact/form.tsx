"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { checkEnkaStatus, submitArtifact } from "@/lib/api";
import { shared } from "@/lib/comms";

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

  // Disable warning for 60 seconds
  shared.signal(
    "warningSolved",
    () => dataHold && warningSrc === "submit" && submit(dataHold, false),
  );

  async function submit(data: FormData, doCheck = true) {
    if (enka && doCheck) {
      const check = await checkEnkaStatus(
        (data.get("uid") ?? "").toString(),
        (data.get("character") ?? "").toString(),
      );
      console.log(data.get("uid"), data.get("character"), check);
      setWarningUid(data.get("character")?.toString());
      setWarningSrc("submit");
      setDataHold(data);
      if (check) return setDialog(check);
    }
    submitArtifact(data, edit)
      .then((q) => {
        if (typeof q === "string") return toast.error(q);
        try {
          // biome-ignore lint/suspicious/noTsIgnore: error appears on build but not visible to biome
          // @ts-ignore
          cookieStore.set("sid", q.id);
        } catch {}
        router.refresh();
      })
      .catch((e) => toast.error(`${e.message || e}`));
  }
  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.target as HTMLFormElement));
      }}
    />
  );
}
