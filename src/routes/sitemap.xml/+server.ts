import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";
import type { RequestHandler } from "./$types";

const staticPages = [
  ["/", "1.0", "yearly"],
  ["/guide", "0.9", "monthly"],
  ["/artifact", "0.8", "monthly"],
  ["/rubgram", "0.8", "monthly"],
  ["/tl", "0.6", "monthly"],
] as const;

export const GET: RequestHandler = async ({ url }) => {
  const tierlists = await db
    .select({ type: tierlistTypes.id, version: tierlistVersions.id })
    .from(tierlistTypes)
    .innerJoin(tierlistVersions, eq(tierlistTypes.id, tierlistVersions.type));
  const pages = [
    ...staticPages.map(([path, priority, frequency]) => ({ path, priority, frequency })),
    ...tierlists.map(({ type, version }) => ({
      path: `/tl/${encodeURIComponent(type)}/${encodeURIComponent(version)}`,
      priority: "0.5",
      frequency: "monthly",
    })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map(
      ({ path, priority, frequency }) =>
        `  <url><loc>${new URL(path, url.origin).href}</loc><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`,
    )
    .join("\n")}\n</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
