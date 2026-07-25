import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cdn, tierlistTypes, tierlistVersions, versions } from "@/lib/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [types, versionRows, gameVersions, files] = await Promise.all([
    db.select().from(tierlistTypes).orderBy(tierlistTypes.order),
    db.select().from(tierlistVersions).orderBy(desc(tierlistVersions.order)),
    db.select().from(versions).orderBy(desc(versions.id)),
    db.select({ id: cdn.id, name: cdn.name }).from(cdn).orderBy(cdn.name),
  ]);
  return {
    types: types.map((type) => ({
      ...type,
      versions: versionRows.filter((version) => version.type === type.id),
    })),
    gameVersions,
    files,
  };
};
