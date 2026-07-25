import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cdn, characters, versions } from "@/lib/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [chars, versionList, files] = await Promise.all([
    db.select().from(characters).orderBy(desc(characters.amber), characters.id),
    db.select().from(versions).orderBy(desc(versions.id)),
    db.select({ id: cdn.id, name: cdn.name }).from(cdn).orderBy(cdn.name),
  ]);
  return { chars, versions: versionList, files };
};
