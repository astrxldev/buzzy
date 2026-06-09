import { and, eq, getTableColumns, not, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/image";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "จัดเทียร์ลิสต์",
  description: "ระบบจัดเทียร์ลิสต์ตัวละครของคอนเทนต์เอนเกม",
};

export default async function TierlistSelectionPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: typeId } = await params;
  const vers = await db
    .select({
      ...getTableColumns(tierlistTypes),
      versions: sql<(typeof tierlistVersions.$inferSelect)[]>`
        COALESCE(
          json_agg(
            json_build_object(
              'id', ${tierlistVersions.id},
              'name', ${tierlistVersions.name},
              'image', ${tierlistVersions.image}
            ) ORDER BY ${tierlistVersions.order} DESC)
          FILTER (WHERE ${tierlistVersions.id} IS NOT NULL),
          '[]'
        )
      `.as("versions"),
    })
    .from(tierlistTypes)
    .leftJoin(
      tierlistVersions,
      and(
        eq(tierlistVersions.type, tierlistTypes.id),
        not(tierlistVersions.hidden),
      ),
    )
    .groupBy(tierlistTypes.id)
    .orderBy(tierlistTypes.id)
    .where(eq(tierlistTypes.id, typeId));

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-6 px-4 py-8">
      {vers.map((t) => (
        <div className="flex flex-col gap-1" key={t.id}>
          <Link
            href="/tl"
            className="flex cursor-default text-muted-foreground hover:underline"
          >
            <ArrowLeft /> กลับไปหน้าแรก
          </Link>
          <div className="text-4xl font-bold">
            <div className="w-fit rounded-md border bg-[#2228] px-2 py-1">
              {t.name}
              <span className="ml-2 text-sm text-muted-foreground">
                {t.mode}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {t.versions.map((e) => (
              <Link href={`/tl/${t.id}/${e.id}`} key={e.id}>
                {e.image ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                    <Image
                      src={`/cdn/${e.image}`}
                      alt={e.name}
                      fill
                      className="rounded-sm border bg-primary object-cover"
                    />
                    <div className="absolute bottom-0 flex w-full justify-center rounded-b-sm bg-black/50 py-1">
                      {e.name}
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-sm border bg-[#1118] text-5xl font-bold backdrop-blur-xl">
                    {e.name}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
