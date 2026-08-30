import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  characters,
  tierlistBadges,
  tierlistColumns,
  tierlistTiers,
  tierlistTypes,
  tierlistVersions,
  versions,
} from "@/lib/db/schema";

export type TierlistBadgeResolved = typeof tierlistBadges.$inferSelect & {
  tier: string[];
};

export type TierlistResolvedConfig = {
  type: typeof tierlistTypes.$inferSelect;
  version: typeof tierlistVersions.$inferSelect;
  tiers: (typeof tierlistTiers.$inferSelect)[];
  columns: (typeof tierlistColumns.$inferSelect)[];
  badges: TierlistBadgeResolved[];
  chars: (typeof characters.$inferSelect)[];
};

type DbLike = Pick<typeof db, "select" | "update">;

type TierlistVersion = typeof tierlistVersions.$inferSelect;

export type TierlistStore = {
  findVersion(
    typeId: string,
    versionId: string,
  ): Promise<TierlistVersion | null>;
  listVersions(typeId: string): Promise<TierlistVersion[]>;
  getType(typeId: string): Promise<typeof tierlistTypes.$inferSelect | null>;
  listCharacterVersions(): Promise<
    Pick<typeof versions.$inferSelect, "id" | "from">[]
  >;
  listCharacters(
    versionIds: string[],
  ): Promise<(typeof characters.$inferSelect)[]>;
  listTiers(): Promise<(typeof tierlistTiers.$inferSelect)[]>;
  listColumns(): Promise<(typeof tierlistColumns.$inferSelect)[]>;
  listBadges(typeId: string): Promise<(typeof tierlistBadges.$inferSelect)[]>;
  saveSnapshot(
    versionId: string,
    config: TierlistResolvedConfig,
  ): Promise<void>;
};

export function normalizeTierlistSnapshot(
  config: TierlistResolvedConfig,
): TierlistResolvedConfig {
  return {
    ...config,
    version: {
      ...config.version,
      snapshot: null,
    },
  };
}

export function resolveCharacterVersionIds(
  versionList: Pick<typeof versions.$inferSelect, "id" | "from">[],
  rootVersionId: string,
) {
  const ids: string[] = [];
  const visited = new Set<string>();
  let cur: string | null = rootVersionId;

  while (cur) {
    if (visited.has(cur)) {
      throw new Error(`Character version ancestry cycle detected at ${cur}`);
    }
    visited.add(cur);
    ids.push(cur);
    const found = versionList.find((version) => version.id === cur);
    cur = found?.from ?? null;
  }

  return ids;
}

async function buildLiveTierlistConfig(
  store: TierlistStore,
  version: TierlistVersion,
) {
  const typeInfo = await store.getType(version.type);
  if (!typeInfo) return null;

  const ids = resolveCharacterVersionIds(
    await store.listCharacterVersions(),
    version.from,
  );
  const chars = ids.length > 0 ? await store.listCharacters(ids) : [];

  const [tiers, columns, badgesList] = await Promise.all([
    store.listTiers(),
    store.listColumns(),
    store.listBadges(version.type),
  ]);

  const badges = badgesList.map((badge) => ({
    ...badge,
    tier: tiers
      .filter((tier) => tier.badges?.includes(badge.id))
      .map((tier) => tier.id),
  }));

  return normalizeTierlistSnapshot({
    type: typeInfo,
    version,
    tiers,
    columns,
    badges,
    chars,
  });
}

export function shouldSnapshotTierlist(
  config: TierlistResolvedConfig,
  now = Date.now(),
) {
  const deprecatedAt = parseTierlistDate(config.version.deprecates);
  const olderThanMonth =
    Number.isFinite(deprecatedAt) &&
    deprecatedAt <= now - 30 * 24 * 60 * 60 * 1000;

  const placed = new Set(
    Object.values(config.version.placements)
      .flat()
      .map((entry) => entry.split("#")[0]),
  );
  const allTiered =
    config.chars.length > 0 &&
    config.chars.every((char) => placed.has(char.id));

  return olderThanMonth || allTiered;
}

export function parseTierlistDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return Number.NaN;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return Number.NaN;
  }

  return date.getTime();
}

async function maybeSnapshotVersion(
  store: TierlistStore,
  version: TierlistVersion,
  config: TierlistResolvedConfig,
) {
  if (version.snapshot || !shouldSnapshotTierlist(config)) return config;

  await store.saveSnapshot(version.id, config);

  return config;
}

function createTierlistStore(tx: DbLike): TierlistStore {
  return {
    async findVersion(typeId, versionId) {
      const [version] = await tx
        .select()
        .from(tierlistVersions)
        .where(
          and(
            eq(tierlistVersions.type, typeId),
            eq(tierlistVersions.id, versionId),
          ),
        );
      return version ?? null;
    },
    async listVersions(typeId) {
      return tx
        .select()
        .from(tierlistVersions)
        .where(eq(tierlistVersions.type, typeId))
        .orderBy(tierlistVersions.order, tierlistVersions.id);
    },
    async getType(typeId) {
      const [typeInfo] = await tx
        .select()
        .from(tierlistTypes)
        .where(eq(tierlistTypes.id, typeId));
      return typeInfo ?? null;
    },
    async listCharacterVersions() {
      return tx.select({ id: versions.id, from: versions.from }).from(versions);
    },
    async listCharacters(versionIds) {
      if (versionIds.length === 0) return [];
      return tx
        .select()
        .from(characters)
        .where(inArray(characters.version, versionIds))
        .orderBy(characters.order);
    },
    async listTiers() {
      return tx.select().from(tierlistTiers).orderBy(tierlistTiers.order);
    },
    async listColumns() {
      return tx.select().from(tierlistColumns).orderBy(tierlistColumns.order);
    },
    async listBadges(typeId) {
      return tx
        .select()
        .from(tierlistBadges)
        .orderBy(tierlistBadges.order, tierlistBadges.id)
        .where(
          or(isNull(tierlistBadges.type), eq(tierlistBadges.type, typeId)),
        );
    },
    async saveSnapshot(versionId, config) {
      await tx
        .update(tierlistVersions)
        .set({ snapshot: config })
        .where(eq(tierlistVersions.id, versionId));
    },
  };
}

export async function getTierlistConfigFromStore(
  store: TierlistStore,
  typeId: string,
  versionId: string,
) {
  const version = await store.findVersion(typeId, versionId);
  if (!version) return null;

  if (version.snapshot) {
    return normalizeTierlistSnapshot(
      version.snapshot as TierlistResolvedConfig,
    );
  }

  const config = await buildLiveTierlistConfig(store, version);
  if (!config) return null;

  return maybeSnapshotVersion(store, version, config);
}

export async function getTierlistConfig(typeId: string, versionId: string) {
  return db.transaction((tx) =>
    getTierlistConfigFromStore(createTierlistStore(tx), typeId, versionId),
  );
}

export async function syncTierlistSnapshotsFromStore(
  store: TierlistStore,
  typeId: string,
) {
  const versionList = await store.listVersions(typeId);

  for (const version of versionList) {
    if (version.snapshot) continue;

    const config = await buildLiveTierlistConfig(store, version);
    if (!config || !shouldSnapshotTierlist(config)) continue;

    await store.saveSnapshot(version.id, config);
  }
}

export async function syncTierlistSnapshots(typeId: string) {
  return db.transaction((tx) => {
    return syncTierlistSnapshotsFromStore(createTierlistStore(tx), typeId);
  });
}
