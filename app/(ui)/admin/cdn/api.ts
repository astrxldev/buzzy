"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { actionLog, cdnify } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { cdn } from "@/lib/db/schema";

export async function fetchToCdn(urls: string[]) {
  if (!(await adminCheck())) throw "Unauthorized";

  async function toFile(res: Response) {
    if (!res.ok) throw "File failed to download";
    return new File(
      [await res.blob()],
      res.headers
        .get("Content-Disposition")
        ?.match(/^attachment;.*filename="([a-zA-Z0-9-_ .]+)"/)?.[1] ||
        res.url.match(/\/([a-zA-Z0-9-_ .]+)$/)?.[1] ||
        `file.${res.headers.get("Content-Type")?.split("/")[1] || "dat"}`,
    );
  }
  return db
    .transaction(async (tx) =>
      Promise.all(
        urls.map((url) =>
          fetch(url, { redirect: "follow" })
            .then(toFile)
            .then((f) => cdnify(f, { tx })),
        ),
      ),
    )
    .finally(() => revalidatePath("/admin/cdn"));
}

export async function rename(id: string, name: string) {
  if (!(await adminCheck())) throw "Unauthorized";

  await db.update(cdn).set({ name }).where(eq(cdn.id, id));

  await actionLog(`Renamed file to "${name}"`, { id });

  revalidatePath("/admin/cdn");
}
