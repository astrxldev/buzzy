"use server";

import { and, desc, ilike, not } from "drizzle-orm";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { guides } from "@/lib/db/schema";
import { searchGuideService } from "./service";

export async function searchGuide(search: string = "", admin = false) {
  return searchGuideService(search, admin, {
    adminCheck,
    search: async (query, includeHidden) =>
      db
        .select()
        .from(guides)
        .where(
          and(
            ilike(guides.name, `%${query}%`),
            includeHidden ? undefined : not(guides.hidden),
          ),
        )
        .orderBy(desc(guides.order)),
  });
}
