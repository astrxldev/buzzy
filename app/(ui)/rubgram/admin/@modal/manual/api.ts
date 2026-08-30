"use server";

import { eq } from "drizzle-orm";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import type { TAccessKey } from "@/lib/db/schema";
import { slipSync } from "@/lib/db/schema";
import { retrieveMobileUploadService } from "./service";

export async function startMobileUpload() {
  return await db
    .insert(slipSync)
    .values({})
    .returning()
    .then((r) => r.pop()!);
}

export async function retrieveMobileUpload(accessKey: TAccessKey) {
  return retrieveMobileUploadService(accessKey, {
    adminCheck,
    consume: async (key) =>
      db
        .delete(slipSync)
        .where(eq(slipSync.accessKey, key as TAccessKey))
        .returning()
        .then((rows) => rows.pop()),
  });
}
