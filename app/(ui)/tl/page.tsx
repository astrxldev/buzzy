import { and, eq, getTableColumns, not, sql } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import TierlistLogo from "#/logos/tierlist.webp";
import { HorizontalDiv } from "@/components/horizontal";
import Image from "@/components/image";
import { SimpleTooltip } from "@/components/tooltip";
import { ScrollBar } from "@/components/ui/scroll-area";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "จัดเทียร์ลิสต์",
  description: "ระบบจัดเทียร์ลิสต์ตัวละครของคอนเทนต์เอนเกม",
};

export default async function TierlistSelectionPage() {
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
    .orderBy(tierlistTypes.id);

  return (
    <div className="mx-2 flex min-h-full max-w-full flex-col justify-center gap-2">
      <center className="mb-2">
        <Link href="/">
          <Image
            src={TierlistLogo}
            alt="Tierlist"
            className="w-1/2 sm:w-96"
            width={200}
            height={100}
            fetchPriority="high"
          />
        </Link>
      </center>
      {vers.map((t) => (
        <div className="flex flex-col gap-1" key={t.id}>
          <Link href={`/tl/${t.id}`} className="w-fit text-4xl font-bold">
            <div className="flex items-center gap-2">
              <div className="rounded-md border bg-[#2228] px-2 py-1">
                {t.name}
                <span className="ml-2 text-sm text-muted-foreground">
                  {t.mode}
                </span>
              </div>
              <SimpleTooltip text="ดูเทียร์ลิสต์ของคอนเทนต์นี้ทั้งหมด">
                <span className="absolute right-0 m-8 ml-2 text-sm font-normal text-blue-400 hover:underline ">
                  ดูทั้งหมด
                  <ArrowRight className="inline-block size-4" />
                </span>
              </SimpleTooltip>
            </div>
          </Link>
          <HorizontalDiv>
            <div className="flex max-w-full gap-2">
              {t.versions.map((e) => (
                <Link href={`/tl/${t.id}/${e.id}`} key={e.id}>
                  {e.image ? (
                    <div className="relative aspect-video w-60 rounded-sm border">
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
                    <div className="flex aspect-video w-60 items-center justify-center rounded-sm border bg-[#1118] text-4xl font-bold backdrop-blur-xl">
                      {e.name}
                    </div>
                  )}
                </Link>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </HorizontalDiv>
        </div>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
