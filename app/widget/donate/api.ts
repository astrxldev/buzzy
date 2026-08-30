"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { getPostHogClient } from "@/lib/posthog-server";
import { markDonationDone, markDonationRunning } from "./service";

export async function markRunning(id: string, credential: string | null) {
  return markDonationRunning(id, credential, {
    configuredCredential: process.env.DONATE_WIDGET_KEY,
    now: () => new Date(),
    capture: (event) => getPostHogClient().capture(event),
    updateLastPing: (donationId, at) =>
      db
        .update(donations)
        .set({ lastPing: at })
        .where(eq(donations.id, donationId)),
  });
}

export async function markDone(id: string, credential: string | null) {
  return markDonationDone(id, credential, {
    configuredCredential: process.env.DONATE_WIDGET_KEY,
    capture: (event) => getPostHogClient().capture(event),
    markSent: (donationId) =>
      db
        .update(donations)
        .set({ sent: true })
        .where(eq(donations.id, donationId)),
  });
}
