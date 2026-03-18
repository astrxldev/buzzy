"use server";

import { ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { guides } from "@/lib/db/schema";

export async function searchGuide(search: string = "") {
  return await db
    .select()
    .from(guides)
    .where(ilike(guides.name, `%${search}%`))
    .orderBy(guides.id);
}
