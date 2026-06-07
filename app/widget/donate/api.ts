"use server";

import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function markRunning(id: string) {
  await db
    .update(donations)
    .set({ lastPing: new Date() })
    .where(eq(donations.id, id));
}

export async function markDone(id: string) {
  await db.update(donations).set({ sent: true }).where(eq(donations.id, id));
}
