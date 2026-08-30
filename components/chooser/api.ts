"use server";

import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { cdn } from "@/lib/db/schema";
import { listFilesService } from "./service";

export async function listFiles() {
  return listFilesService({
    adminCheck,
    list: () =>
      db
        .select({ id: cdn.id, name: cdn.name, size: cdn.size, type: cdn.type })
        .from(cdn),
  });
}
