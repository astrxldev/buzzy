import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { base } from "@/lib/const";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tlTypes = await db
    .select({ type: tierlistTypes.id, version: tierlistVersions.id })
    .from(tierlistTypes)
    .innerJoin(tierlistVersions, eq(tierlistTypes.id, tierlistVersions.type));

  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${base}/artifact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/rubgram`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/tl`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...tlTypes.map(
      (t) =>
        ({
          url: `${base}/tl/${t.type}/${t.version}`,
          lastModified: new Date(),
          changeFrequency: "monthly",
          priority: 0.6,
        }) as const,
    ),
  ];
}
