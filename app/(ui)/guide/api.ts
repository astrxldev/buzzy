"use server";

import { and, desc, ilike, not } from "drizzle-orm";
import { db } from "@/lib/db";
import { guides } from "@/lib/db/schema";

export async function searchGuide(search: string = "", admin = false) {
  return await db
    .select()
    .from(guides)
    .where(
      and(
        ilike(guides.name, `%${search}%`),
        admin ? undefined : not(guides.hidden),
      ),
    )
    .orderBy(desc(guides.order));
}
