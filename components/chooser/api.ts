"use server";

import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { cdn } from "@/lib/db/schema";

export async function listFiles() {
  if (!(await adminCheck())) throw "Unauthorized";

  return await db
    .select({ id: cdn.id, name: cdn.name, size: cdn.size, type: cdn.type })
    .from(cdn);
}
