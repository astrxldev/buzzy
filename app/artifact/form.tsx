"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitArtifact } from "@/lib/api";

export function ArtifactFormWrapper(props: React.ComponentProps<"form">) {
  const router = useRouter();
  async function submit(data: FormData) {
    console.log(Object.fromEntries(data.entries()));
    submitArtifact(data)
      .then((q) => {
        if (typeof q === "string") return toast.error(q);
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
