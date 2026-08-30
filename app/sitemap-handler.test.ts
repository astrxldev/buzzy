import { describe, expect, mock, test } from "bun:test";
import { createSitemap } from "./sitemap-handler";

describe("sitemap", () => {
  test("includes static and database-backed tier-list pages", async () => {
    const date = new Date("2026-08-30T00:00:00Z");
    const getTierLists = mock(async () => [
      { type: "genshin", version: "5.0" },
      { type: "hsr", version: "3.2" },
    ]);
    const result = await createSitemap({
      base: "https://buzz.test",
      getTierLists,
      now: () => date,
    })();
    expect(result.map(({ url }) => url)).toEqual([
      "https://buzz.test/",
      "https://buzz.test/guide",
      "https://buzz.test/artifact",
      "https://buzz.test/rubgram",
      "https://buzz.test/tl",
      "https://buzz.test/tl/genshin/5.0",
      "https://buzz.test/tl/hsr/3.2",
    ]);
    expect(
      result.every(({ lastModified }) => lastModified === date),
    ).toBeTrue();
    expect(result.at(-1)).toMatchObject({
      changeFrequency: "monthly",
      priority: 0.5,
    });
  });

  test("handles no dynamic tier lists", async () => {
    const result = await createSitemap({
      base: "https://buzz.test",
      getTierLists: async () => [],
    })();
    expect(result).toHaveLength(5);
  });
});
