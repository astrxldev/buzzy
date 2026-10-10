import { describe, expect, test } from "bun:test";
import { shouldSnapshot, type TierlistResolvedConfig } from "./tierlist";

function config({
  deprecates = "01/01/2000",
  chars = [{ id: "char-1" }, { id: "char-2" }],
  placements = { S: ["char-1#2026-01", "char-2"] },
}: {
  deprecates?: string;
  chars?: { id: string }[];
  placements?: Record<string, string[]>;
} = {}) {
  return {
    version: { deprecates, placements },
    chars,
  } as unknown as TierlistResolvedConfig;
}

describe("shouldSnapshot", () => {
  test("does not snapshot a fully tiered version before its deprecation date", () => {
    expect(shouldSnapshot(config({ deprecates: "31/12/2999" }))).toBe(false);
  });

  test("does not snapshot an old version with unfinished placements", () => {
    expect(shouldSnapshot(config({ placements: { S: ["char-1"] } }))).toBe(
      false,
    );
  });

  test("snapshots an old version only when every character is tiered", () => {
    expect(shouldSnapshot(config())).toBe(true);
  });

  test("does not consider an empty character list fully tiered", () => {
    expect(shouldSnapshot(config({ chars: [] }))).toBe(false);
  });

  test("does not snapshot when the deprecation date is invalid", () => {
    expect(
      shouldSnapshot(
        config({
          deprecates: "not-a-date",
          placements: { S: ["char-1", "char-2"] },
        }),
      ),
    ).toBe(false);
  });

  test("does not snapshot when the deprecation date is missing", () => {
    expect(
      shouldSnapshot(
        config({ deprecates: "", placements: { S: ["char-1", "char-2"] } }),
      ),
    ).toBe(false);
  });
});
