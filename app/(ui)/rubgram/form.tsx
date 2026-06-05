"use client";

import { useProgress } from "@bprogress/next";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { toast } from "sonner";
import {
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
    posthog.capture(
      type === "registration"
        ? "rubgram_registration_submitted"
        : "rubgram_payment_submitted",
    );

    ({ registration: submitEndgame, payment: submitEndgamePayment })
      [type](data)
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
