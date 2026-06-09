"use server";

import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { asc, desc } from "drizzle-orm";

export async function getTopDonate() {
  const [top] = await db
    .select({
      name: donations.name,
      amount: donations.amount,
    })
    .from(donations)
    .limit(1)
    .orderBy(desc(donations.amount), asc(donations.id));
  return top;
}
