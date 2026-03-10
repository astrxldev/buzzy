"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitArtifact } from "@/lib/api";

export function ArtifactFormWrapper({
  edit,
  ...props
}: React.ComponentProps<"form"> & { edit?: { sub: string; token: string } }) {
  const router = useRouter();
  async function submit(data: FormData) {
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
