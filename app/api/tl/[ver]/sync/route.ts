import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tierlistStates, tierlistVersions } from "@/lib/db/schema";
import type { TierlistSyncData } from "@/lib/tierlist-sync";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ver: string }> },
) {
  const { ver } = await params;
  const data = await db.transaction(async (tx): Promise<TierlistSyncData> => {
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
    const states = await tx
      .select()
      .from(tierlistStates)
      .where(eq(tierlistStates.list, ver));
    const [version] = await tx
      .select({ placements: tierlistVersions.placements })
      .from(tierlistVersions)
      .where(eq(tierlistVersions.id, ver))
      .limit(1);

    return { states, placements: version?.placements ?? {} };
  });

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
