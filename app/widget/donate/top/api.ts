"use server";

import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { asc, desc, max, sum } from "drizzle-orm";

export async function getTopDonate() {
  const [top] = await db
    .select({
      name: donations.name,
      amount: sum(donations.amount),
    })
    .from(donations)
    .limit(1)
    .groupBy(donations.name)
    .orderBy(desc(sum(donations.amount)), asc(max(donations.id)));
  return top;
}
