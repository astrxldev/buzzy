import type { MetadataRoute } from "next";

type TierList = { type: string; version: string };

export function createSitemap(dependencies: {
  base: string;
  getTierLists: () => Promise<TierList[]>;
  now?: () => Date;
}) {
  return async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = (dependencies.now ?? (() => new Date()))();
    const page = (
      path: string,
      changeFrequency: "yearly" | "monthly",
      priority: number,
    ) => ({
      url: `${dependencies.base}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    });
    const tierLists = await dependencies.getTierLists();
    return [
      page("/", "yearly", 1),
      page("/guide", "monthly", 0.9),
      page("/artifact", "monthly", 0.8),
      page("/rubgram", "monthly", 0.8),
      page("/tl", "monthly", 0.6),
      ...tierLists.map(({ type, version }) =>
        page(`/tl/${type}/${version}`, "monthly", 0.5),
      ),
    ];
  };
}
