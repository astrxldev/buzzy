"use server";

import { gt, sum } from "drizzle-orm";
import { getArtifactConfig } from "@/lib/api";
import { db } from "@/lib/db";
import { donations, settings } from "@/lib/db/schema";

export async function getDonateBar() {
  const { donateGoalStarting } = await getArtifactConfig();
  const [{ amount }] = await db
    .select({
      amount: sum(donations.amount),
    })
    .from(donations)
    .where(gt(donations.created, donateGoalStarting ?? new Date(0)));
  const [{ goal }] = await db
    .select({ goal: settings.donateGoal })
    .from(settings)
    .limit(1);
  return { amount, goal };
}
