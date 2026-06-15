"use server";

import { db } from "@/lib/db";
import { donations, settings } from "@/lib/db/schema";
import { sum } from "drizzle-orm";

export async function getDonateBar() {
  const [{ amount }] = await db
    .select({
      amount: sum(donations.amount),
    })
    .from(donations);
  const [{ goal }] = await db
    .select({ goal: settings.donateGoal })
    .from(settings)
    .limit(1);
  return { amount, goal };
}
