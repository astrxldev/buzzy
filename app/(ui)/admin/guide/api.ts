"use server";

import { eq, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { guides } from "@/lib/db/schema";

export async function hideGuide(id: string) {
  if (!(await adminCheck())) redirect("/login");
  await db
    .update(guides)
    .set({
      hidden: not(guides.hidden),
    })
    .where(eq(guides.id, id));
  revalidatePath("/admin/guide");
}
