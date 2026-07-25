import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { asc, desc, eq, gt, max, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { donations, settings } from "@/lib/db/schema";
import { getPostHogClient } from "@/lib/posthog-server";
import { getArtifactConfig } from "$lib/server/data";

export const getDonateBar = query(async () => {
  const { donateGoalStarting } = await getArtifactConfig();
  const [[amount], [goal]] = await Promise.all([
    db
      .select({ amount: sum(donations.amount) })
      .from(donations)
      .where(gt(donations.created, donateGoalStarting ?? new Date(0))),
    db.select({ goal: settings.donateGoal }).from(settings).limit(1),
  ]);
  return { amount: amount?.amount ?? null, goal: goal?.goal ?? null };
});

export const getTopDonate = query(async () => {
  const [top] = await db
    .select({ name: donations.name, amount: sum(donations.amount) })
    .from(donations)
    .limit(1)
    .groupBy(donations.name)
    .orderBy(desc(sum(donations.amount)), asc(max(donations.id)));
  return top;
});

const widgetCommandSchema = z.object({ id: z.string(), key: z.string() });

function authenticateWidget(key: string) {
  if (!process.env.DONATE_WIDGET_KEY || key !== process.env.DONATE_WIDGET_KEY) {
    error(403, "Forbidden");
  }
}

export const markRunning = command(widgetCommandSchema, async ({ id, key }) => {
  authenticateWidget(key);
  getPostHogClient().capture({
    distinctId: id,
    event: "donation_widget_state_playing",
    properties: { donation_id: id },
  });
  await db
    .update(donations)
    .set({ lastPing: new Date() })
    .where(eq(donations.id, id));
});

export const markDone = command(widgetCommandSchema, async ({ id, key }) => {
  authenticateWidget(key);
  getPostHogClient().capture({
    distinctId: id,
    event: "donation_widget_state_shown",
    properties: { donation_id: id },
  });
  await db.update(donations).set({ sent: true }).where(eq(donations.id, id));
});
