"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitArtifact } from "@/lib/api";

export function ArtifactFormWrapper(props: React.ComponentProps<"form">) {
  const router = useRouter();
  async function submit(data: FormData) {
    submitArtifact(data)
      .then((q) => {
        cookieStore.set("sid", q.id);
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
