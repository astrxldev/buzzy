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

function normalizeSnapshot(
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

async function resolveCharacterVersions(tx: DbLike, rootVersionId: string) {
  const vers = await tx
    .select({ id: versions.id, from: versions.from })
    .from(versions);
  const ids: string[] = [];
  let cur: string | null = rootVersionId;

  while (cur) {
    ids.push(cur);
    const found = vers.find((version) => version.id === cur);
    cur = found?.from ?? null;
  }

  return ids;
}

async function buildLiveTierlistConfig(
  tx: DbLike,
  version: typeof tierlistVersions.$inferSelect,
) {
  const [typeInfo] = await tx
    .select()
    .from(tierlistTypes)
    .where(eq(tierlistTypes.id, version.type));
  if (!typeInfo) return null;

  const ids = await resolveCharacterVersions(tx, version.from);
  const chars =
    ids.length > 0
      ? await tx
          .select()
          .from(characters)
          .where(inArray(characters.version, ids))
          .orderBy(characters.order)
      : ([] as (typeof characters.$inferSelect)[]);

  const [tiers, columns, badgesList] = await Promise.all([
    tx.select().from(tierlistTiers).orderBy(tierlistTiers.order),
    tx.select().from(tierlistColumns).orderBy(tierlistColumns.order),
    tx
      .select()
      .from(tierlistBadges)
      .orderBy(tierlistBadges.order, tierlistBadges.id)
      .where(
        or(isNull(tierlistBadges.type), eq(tierlistBadges.type, version.type)),
      ),
  ]);

  const badges = badgesList.map((badge) => ({
    ...badge,
    tier: tiers
      .filter((tier) => tier.badges?.includes(badge.id))
      .map((tier) => tier.id),
  }));

  return normalizeSnapshot({
    type: typeInfo,
    version,
    tiers,
    columns,
    badges,
    chars,
  });
}

function shouldSnapshot(config: TierlistResolvedConfig) {
  const deprecatedAt = Date.parse(config.version.deprecates);
  const olderThanMonth =
    Number.isFinite(deprecatedAt) &&
    deprecatedAt <= Date.now() - 30 * 24 * 60 * 60 * 1000;

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

async function maybeSnapshotVersion(
  tx: DbLike,
  version: typeof tierlistVersions.$inferSelect,
  config: TierlistResolvedConfig,
) {
  if (version.snapshot || !shouldSnapshot(config)) return config;

  await tx
    .update(tierlistVersions)
    .set({ snapshot: config })
    .where(eq(tierlistVersions.id, version.id));

  return config;
}

export async function getTierlistConfig(typeId: string, versionId: string) {
  return db.transaction(async (tx) => {
    const [version] = await tx
      .select()
      .from(tierlistVersions)
      .where(
        and(
          eq(tierlistVersions.type, typeId),
          eq(tierlistVersions.id, versionId),
        ),
      );
    if (!version) return null;

    if (version.snapshot) {
      return normalizeSnapshot(version.snapshot as TierlistResolvedConfig);
    }

    const config = await buildLiveTierlistConfig(tx, version);
    if (!config) return null;

    return maybeSnapshotVersion(tx, version, config);
  });
}

export async function syncTierlistSnapshots(typeId: string) {
  return db.transaction(async (tx) => {
    const versionList = await tx
      .select()
      .from(tierlistVersions)
      .where(eq(tierlistVersions.type, typeId))
      .orderBy(tierlistVersions.order, tierlistVersions.id);

    for (const version of versionList) {
      if (version.snapshot) continue;

      const config = await buildLiveTierlistConfig(tx, version);
      if (!config || !shouldSnapshot(config)) continue;

      await tx
        .update(tierlistVersions)
        .set({ snapshot: config })
        .where(eq(tierlistVersions.id, version.id));
    }
  });
}
