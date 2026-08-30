import { describe, expect, mock, test } from "bun:test";
import type { TierlistResolvedConfig, TierlistStore } from "./tierlist";
import {
  getTierlistConfigFromStore,
  normalizeTierlistSnapshot,
  parseTierlistDate,
  resolveCharacterVersionIds,
  shouldSnapshotTierlist,
  syncTierlistSnapshotsFromStore,
} from "./tierlist";

type Version = Awaited<ReturnType<TierlistStore["findVersion"]>>;

function version(overrides: Record<string, unknown> = {}) {
  return {
    id: "list-1",
    name: "List 1",
    hidden: false,
    type: "main",
    image: null,
    disclaimer: null,
    deprecates: "not scheduled",
    from: "v3",
    order: 1,
    placements: {},
    snapshot: null,
    ...overrides,
  } as NonNullable<Version>;
}

function config(overrides: Partial<TierlistResolvedConfig> = {}) {
  return {
    type: { id: "main", name: "Main", image: null, order: 1, mode: "team" },
    version: version(),
    tiers: [],
    columns: [],
    badges: [],
    chars: [],
    ...overrides,
  } as TierlistResolvedConfig;
}

function character(id: string, characterVersion = "v3") {
  return {
    id,
    name: id,
    version: characterVersion,
    stars: 5,
    vision: "electro",
    image: `${id}-image`,
    weapon: "sword",
    amber: id,
    order: 1,
  } as TierlistResolvedConfig["chars"][number];
}

function store(overrides: Partial<TierlistStore> = {}) {
  return {
    findVersion: mock(async () => version()),
    listVersions: mock(async () => []),
    getType: mock(async () => ({
      id: "main",
      name: "Main",
      image: null,
      order: 1,
      mode: "team",
    })),
    listCharacterVersions: mock(async () => [
      { id: "v3", from: "v2" },
      { id: "v2", from: "v1" },
      { id: "v1", from: null },
    ]),
    listCharacters: mock(async () => []),
    listTiers: mock(async () => []),
    listColumns: mock(async () => []),
    listBadges: mock(async () => []),
    saveSnapshot: mock(async () => {}),
    ...overrides,
  } as TierlistStore;
}

describe("tier-list character ancestry", () => {
  test("resolves the root and all ancestors in nearest-first order", () => {
    expect(
      resolveCharacterVersionIds(
        [
          { id: "base", from: null },
          { id: "middle", from: "base" },
          { id: "current", from: "middle" },
          { id: "unrelated", from: null },
        ],
        "current",
      ),
    ).toEqual(["current", "middle", "base"]);
  });

  test("keeps an unknown root and stops at the missing parent", () => {
    expect(resolveCharacterVersionIds([], "missing")).toEqual(["missing"]);
    expect(
      resolveCharacterVersionIds(
        [{ id: "current", from: "missing" }],
        "current",
      ),
    ).toEqual(["current", "missing"]);
  });

  test.each([
    [[{ id: "a", from: "a" }], "a"],
    [
      [
        { id: "a", from: "b" },
        { id: "b", from: "c" },
        { id: "c", from: "a" },
      ],
      "a",
    ],
  ])("rejects ancestry cycles", (versions, root) => {
    expect(() => resolveCharacterVersionIds(versions, root)).toThrow(
      "Character version ancestry cycle detected",
    );
  });
});

describe("tier-list snapshot rules", () => {
  test("normalizes embedded snapshots without mutating them", () => {
    const original = config({
      version: version({ snapshot: { persisted: true } }),
    });
    const normalized = normalizeTierlistSnapshot(original);

    expect(normalized.version.snapshot).toBeNull();
    expect(original.version.snapshot).toEqual({ persisted: true });
    expect(normalized).not.toBe(original);
    expect(normalized.version).not.toBe(original.version);
  });

  test.each([
    ["29/02/2024", true],
    ["29/02/2023", false],
    ["31/04/2024", false],
    ["00/01/2024", false],
    ["01/13/2024", false],
    ["1/01/2024", false],
    ["2024-01-01", false],
  ])("validates date %s", (value, valid) => {
    expect(Number.isFinite(parseTierlistDate(value))).toBe(valid);
  });

  test("snapshots at the exact 30-day boundary but not before it", () => {
    const deprecated = parseTierlistDate("01/06/2024");
    const candidate = config({
      version: version({ deprecates: "01/06/2024" }),
    });
    const month = 30 * 24 * 60 * 60 * 1000;

    expect(
      shouldSnapshotTierlist(candidate, deprecated + month - 1),
    ).toBeFalse();
    expect(shouldSnapshotTierlist(candidate, deprecated + month)).toBeTrue();
  });

  test("snapshots only when every available character has a placement", () => {
    const chars = [character("a"), character("b")];

    expect(
      shouldSnapshotTierlist(
        config({
          chars,
          version: version({ placements: { dps: ["a#copy"], support: ["b"] } }),
        }),
      ),
    ).toBeTrue();
    expect(
      shouldSnapshotTierlist(
        config({ chars, version: version({ placements: { dps: ["a"] } }) }),
      ),
    ).toBeFalse();
    expect(
      shouldSnapshotTierlist(
        config({ chars: [], version: version({ placements: { dps: [] } }) }),
      ),
    ).toBeFalse();
  });

  test("an old valid date snapshots an incomplete list; malformed dates do not", () => {
    expect(
      shouldSnapshotTierlist(
        config({ version: version({ deprecates: "01/01/2000" }) }),
      ),
    ).toBeTrue();
    expect(
      shouldSnapshotTierlist(
        config({ version: version({ deprecates: "31/02/2000" }) }),
      ),
    ).toBeFalse();
  });
});

describe("getTierlistConfigFromStore", () => {
  test("returns null when the version or type does not exist", async () => {
    const noVersion = store({ findVersion: mock(async () => null) });
    expect(
      await getTierlistConfigFromStore(noVersion, "main", "missing"),
    ).toBeNull();
    expect(noVersion.listCharacterVersions).not.toHaveBeenCalled();

    const noType = store({ getType: mock(async () => null) });
    expect(
      await getTierlistConfigFromStore(noType, "main", "list-1"),
    ).toBeNull();
    expect(noType.listCharacterVersions).not.toHaveBeenCalled();
  });

  test("returns a normalized persisted snapshot without rebuilding or saving", async () => {
    const persisted = config({ version: version({ snapshot: null }) });
    const source = store({
      findVersion: mock(async () => version({ snapshot: persisted })),
    });

    const result = await getTierlistConfigFromStore(source, "main", "list-1");
    expect(result?.version.snapshot).toBeNull();
    expect(source.getType).not.toHaveBeenCalled();
    expect(source.saveSnapshot).not.toHaveBeenCalled();
  });

  test("builds inherited characters, resolves badge tiers, and saves a complete list", async () => {
    const chars = [character("a", "v3"), character("b", "v1")];
    const source = store({
      findVersion: mock(async () =>
        version({ placements: { dps: ["a", "b#alternate"] } }),
      ),
      listCharacters: mock(async () => chars),
      listTiers: mock(async () => [
        { id: "s", name: "S", badges: ["carry"], image: null, order: 1 },
        { id: "a", name: "A", badges: null, image: null, order: 2 },
      ]),
      listBadges: mock(async () => [
        { id: "carry", name: "Carry", image: null, order: 1, type: null },
      ]),
    });

    const result = await getTierlistConfigFromStore(source, "main", "list-1");
    expect(source.listCharacters).toHaveBeenCalledWith(["v3", "v2", "v1"]);
    expect(result?.badges[0].tier).toEqual(["s"]);
    expect(result?.version.snapshot).toBeNull();
    expect(source.saveSnapshot).toHaveBeenCalledTimes(1);
    expect(source.saveSnapshot).toHaveBeenCalledWith("list-1", result);
  });

  test("does not save a current incomplete live list", async () => {
    const source = store({
      listCharacters: mock(async () => [character("a")]),
    });
    const result = await getTierlistConfigFromStore(source, "main", "list-1");

    expect(result?.chars).toHaveLength(1);
    expect(source.saveSnapshot).not.toHaveBeenCalled();
  });
});

describe("syncTierlistSnapshotsFromStore", () => {
  test("skips existing snapshots and saves every newly eligible version", async () => {
    const versions = [
      version({
        id: "saved",
        from: "saved",
        snapshot: { already: true },
        order: 1,
      }),
      version({
        id: "complete",
        from: "complete",
        placements: { dps: ["c"] },
        order: 2,
      }),
      version({ id: "old", from: "old", deprecates: "01/01/2000", order: 3 }),
      version({ id: "current", from: "current", order: 4 }),
    ];
    const source = store({
      listVersions: mock(async () => versions),
      listCharacterVersions: mock(async () =>
        versions.map(({ from }) => ({ id: from, from: null })),
      ),
      listCharacters: mock(async (ids) =>
        ids[0] === "complete" || ids[0] === "current"
          ? [character(ids[0] === "complete" ? "c" : ids[0], ids[0])]
          : [],
      ),
    });

    await syncTierlistSnapshotsFromStore(source, "main");

    expect(source.listVersions).toHaveBeenCalledWith("main");
    expect(source.saveSnapshot).toHaveBeenCalledTimes(2);
    expect(
      (source.saveSnapshot as ReturnType<typeof mock>).mock.calls.map(
        ([id]) => id,
      ),
    ).toEqual(["complete", "old"]);
    expect(source.getType).toHaveBeenCalledTimes(3);
  });
});
