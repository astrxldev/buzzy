"use server";

import { eq, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { guides } from "@/lib/db/schema";
import { forceRefresh } from "../settings/api";
import { hideGuideService } from "./service";

export async function hideGuide(id: string) {
  return hideGuideService(id, {
    adminCheck: async () => {
      if (!(await adminCheck())) redirect("/login");
      return true;
    },
    toggle: async (guideId) => {
      await db
        .update(guides)
        .set({ hidden: not(guides.hidden) })
        .where(eq(guides.id, guideId));
    },
    afterToggle: async () => {
      await forceRefresh("/guide");
      revalidatePath("/admin/guide");
    },
  });
}
