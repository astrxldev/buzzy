"use server";

import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { fileToDataUrl } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { getPostHogClient } from "@/lib/posthog-server";

export async function testPopup() {
  if (!(await adminCheck())) throw new Error("Unauthorized");

  getPostHogClient().capture({
    distinctId: "admin",
    event: "donation_admin_test_popup",
  });

  sse.donate.pub("ping", {
    id: "test",
    name: "Mr. Buzz",
    message: "นี่คือข้อความทดสอบโดเนท",
    amount: 67,
  });
}

export async function reloadWidget() {
  if (!(await adminCheck())) throw new Error("Unauthorized");

  getPostHogClient().capture({
    distinctId: "admin",
    event: "donation_admin_widget_reload",
  });

  sse.donate.pub("refresh", null);
}

export async function resendPopup(id: string) {
  if (!(await adminCheck())) throw new Error("Unauthorized");
  const [sub] = await db
    .update(donations)
    .set({ sent: false })
    .where(eq(donations.id, id))
    .returning();
  if (!sub) throw new Error("not found");

  getPostHogClient().capture({
    distinctId: "admin",
    event: "donation_admin_resend",
    properties: { id },
  });

  sse.donate.pub("ping", {
    ...sub,
    message: sub.message ?? "",
    image: sub.image
      ? await fileToDataUrl(new File([Buffer.from(sub.image)], "abc.jpeg"))
      : undefined,
  });
}

export async function getImage(id: string) {
  if (!(await adminCheck())) throw new Error("Unauthorized");
  const [sub] = await db
    .select({ image: donations.image })
    .from(donations)
    .where(eq(donations.id, id));
  if (!sub) throw new Error("not found");
  if (!sub.image) throw new Error("no image");

  return new Blob([Buffer.from(sub.image)], { type: "image/jpeg" });
}
