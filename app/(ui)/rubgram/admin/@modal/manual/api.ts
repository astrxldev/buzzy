"use server";

import { db } from "@/lib/db";
import type { TAccessKey } from "@/lib/db/schema";
import { slipSync } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function startMobileUpload() {
  return await db
    .insert(slipSync)
    .values({})
    .returning()
    .then((r) => r.pop()!);
}

export async function retrieveMobileUpload(accessKey: TAccessKey) {
  const object = await db
    .delete(slipSync)
    .where(eq(slipSync.accessKey, accessKey))
    .returning()
    .then((r) => r.pop()!);
  const fd = new FormData();
  fd.set(
    "file",
    new File([Buffer.from(object.data!)], object.name!, {
      type: object.type!,
    }),
  );
  fd.set("name", object.name!);
  return fd;
}
