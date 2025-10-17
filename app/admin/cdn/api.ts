"use server";

import { revalidatePath } from "next/cache";
import { cdnify } from "@/lib/api";
import { db } from "@/lib/db";

export async function fetchToCdn(urls: string[]) {
  async function toFile(res: Response) {
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
