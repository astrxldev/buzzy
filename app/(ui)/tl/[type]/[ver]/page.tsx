import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
import { TierList } from "./tierlist";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; ver: string }>;
}): Promise<Metadata> {
  const { type: typeId, ver: verId } = await params;

  try {
    const [[{ name: type }], [{ name: ver }]] = await Promise.all([
      db
        .select({ name: tierlistTypes.name })
        .from(tierlistTypes)
        .where(eq(tierlistTypes.id, typeId)),
      db
        .select({ name: tierlistVersions.name })
        .from(tierlistVersions)
        .where(eq(tierlistVersions.id, verId)),
    ]);

    return {
      title: `จัดเทียร์ลิสต์ ${type} ${ver}`,
    };
  } catch {
    return {
      title: "จัดเทียร์ลิสต์",
    };
  }
}

export default async function TierlistPage({
  params,
}: {
  params: Promise<{ type: string; ver: string }>;
}) {
  const { type, ver } = await params;
  const config = await db.transaction(async (tx) => {
    // resolve version info
    const [version] = await tx
      .select()
      .from(tierlistVersions)
      .where(
        and(eq(tierlistVersions.type, type), eq(tierlistVersions.id, ver)),
      );
    if (!version) return;
    const [typeInfo] = await tx
      .select()
      .from(tierlistTypes)
      .where(eq(tierlistTypes.id, type));

    // resolve `from` fields
    const vers = await tx
      .select({ id: versions.id, from: versions.from })
      .from(versions);
    const ids: string[] = [];
    let cur: string | null = version.from;
    while (cur) {
      ids.push(cur);
      const r = vers.find((v) => v.id === cur);
      cur = r?.from ?? null;
    }

    const chars =
      ids.length > 0
        ? await tx
            .select()
            .from(characters)
            .where(inArray(characters.version, ids))
            .orderBy(characters.order)
        : ([] as (typeof characters.$inferSelect)[]);

    // fetch rows, columns, badges data...
    const [tiers, columns, badgesList] = await Promise.all([
      tx.select().from(tierlistTiers).orderBy(tierlistTiers.order),
      tx.select().from(tierlistColumns).orderBy(tierlistColumns.order),
      tx
        .select()
        .from(tierlistBadges)
        .orderBy(tierlistBadges.order)
        .where(
          or(
            isNull(tierlistBadges.type),
            eq(tierlistBadges.type, version.type),
          ),
        ),
    ]);
    const badges = badgesList.map((b) => ({
      ...b,
      tier: tiers.filter((t) => t.badges?.includes(b.id)).map((t) => t.id),
    }));

    return { type: typeInfo, version, tiers, columns, badges, chars };
  });
  // console.log(config);
  if (!config) notFound();
  return <TierList {...config} />;
  // return <pre>{JSON.stringify(config, null, 2)}</pre>;
}
