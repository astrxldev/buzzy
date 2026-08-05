import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";
import { getTierlistConfig } from "@/lib/tierlist";
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
  const config = await getTierlistConfig(type, ver);
  if (!config) notFound();
  return <TierList {...config} />;
  // return <pre>{JSON.stringify(config, null, 2)}</pre>;
}
