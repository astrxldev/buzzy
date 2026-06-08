"use server";

import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { fileToDataUrl } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function testPopup() {
  if (!(await adminCheck())) throw new Error("Unauthorized");

  sse.donate.pub("ping", {
    id: "test",
    name: "Mr. Buzz",
    message: "นี่คือข้อความทดสอบโดเนท",
    amount: 67,
  });
}

export async function reloadWidget() {
  if (!(await adminCheck())) throw new Error("Unauthorized");

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

  sse.donate.pub("ping", {
    ...sub,
    message: sub.message ?? "",
    image: sub.image
      ? await fileToDataUrl(new File([Buffer.from(sub.image)], "abc.jpeg"))
      : undefined,
  });
}
