"use server";

import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPostHogClient } from "@/lib/posthog-server";

export async function markRunning(id: string) {
  getPostHogClient().capture({ distinctId: id, event: "donation_widget_state_playing", properties: { donation_id: id } });

  await db
    .update(donations)
    .set({ lastPing: new Date() })
    .where(eq(donations.id, id));
}

export async function markDone(id: string) {
  getPostHogClient().capture({ distinctId: id, event: "donation_widget_state_shown", properties: { donation_id: id } });

  await db.update(donations).set({ sent: true }).where(eq(donations.id, id));
}
