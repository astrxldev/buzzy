import { eq } from "drizzle-orm";
import { base } from "@/lib/const";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";
import { createSitemap } from "./sitemap-handler";

export default createSitemap({
  base,
  getTierLists: () =>
    db
      .select({ type: tierlistTypes.id, version: tierlistVersions.id })
      .from(tierlistTypes)
      .innerJoin(tierlistVersions, eq(tierlistTypes.id, tierlistVersions.type)),
});

export const dynamic = "force-dynamic";
