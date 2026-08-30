"use server";

import { gt, sum } from "drizzle-orm";
import { getArtifactConfig } from "@/lib/api";
import { db } from "@/lib/db";
import { donations, settings } from "@/lib/db/schema";
import { getDonationGoal } from "../service";

export async function getDonateBar() {
  return getDonationGoal({
    getGoalStart: async () => (await getArtifactConfig()).donateGoalStarting,
    async sumSince(starting) {
      const [{ amount }] = await db
        .select({ amount: sum(donations.amount) })
        .from(donations)
        .where(gt(donations.created, starting));
      return amount;
    },
    async getGoal() {
      const [{ goal }] = await db
        .select({ goal: settings.donateGoal })
        .from(settings)
        .limit(1);
      return goal;
    },
  });
}
