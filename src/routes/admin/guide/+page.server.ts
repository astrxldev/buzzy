import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cdn, guides } from "@/lib/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [list, files, [{ maxOrder }]] = await Promise.all([
    db.select().from(guides).orderBy(guides.order),
    db.select({ id: cdn.id, name: cdn.name }).from(cdn).orderBy(cdn.name),
    db.select({ maxOrder: sql<number>`coalesce(max(${guides.order}), 0)` }).from(guides),
  ]);
  return { guides: list, files, nextOrder: Number(maxOrder) + 10 };
};
