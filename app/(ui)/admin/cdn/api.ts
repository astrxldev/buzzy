"use server";

import { eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { actionLog, cdnify } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { cdn } from "@/lib/db/schema";
import { fetchToCdnService } from "./service";

export async function fetchToCdn(urls: string[]) {
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction type parameters
  return fetchToCdnService<PgDatabase<any, any, any>, string>(urls, {
    adminCheck,
    fetch: (url) => fetch(url, { redirect: "follow" }),
    transaction: (callback) => db.transaction(callback),
    importFile: (file, tx) => cdnify(file, { tx }),
    afterImport: () => revalidatePath("/admin/cdn"),
  });
}

export async function rename(id: string, name: string) {
  if (!(await adminCheck())) throw "Unauthorized";

  await db.update(cdn).set({ name }).where(eq(cdn.id, id));

  await actionLog(`Renamed file to "${name}"`, { id });

  revalidatePath("/admin/cdn");
}
