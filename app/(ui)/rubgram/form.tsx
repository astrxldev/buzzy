"use client";

import { useProgress } from "@bprogress/next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  type EndgameFormData,
  type EndgamePaymentFormData,
  submitEndgame,
  submitEndgamePayment,
} from "./api";

export function EndgameFormWrapper({
  type,
  ...props
}: React.ComponentProps<"form"> & { type: "registration" | "payment" }) {
  const router = useRouter();
  const { start, stop } = useProgress();
  async function submit(data: FormData) {
    start();

    ({ registration: submitEndgame, payment: submitEndgamePayment })
      [type](data as unknown as EndgameFormData & EndgamePaymentFormData)
      .then((q) => {
        if (typeof q === "string") return toast.error(q);
        try {
          // biome-ignore lint/suspicious/noTsIgnore: error appears on build but not visible to biome
          // @ts-ignore
          cookieStore.set("rsid", q.id);
        } catch (e) {
          console.error("Failed to set cookie", e);
        }
        router.refresh();
      })
      .catch((e) => toast.error(`${e.message || e}`))
      .finally(stop);
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
