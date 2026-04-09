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
    <div className="max-w-full min-h-full flex flex-col justify-center gap-2 mx-2">
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
          <Link href={`/tl/${t.id}`} className="font-bold text-4xl w-fit">
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 border rounded-md bg-[#2228]">
                {t.name}
                <span className="text-sm text-muted-foreground ml-2">
                  {t.mode}
                </span>
              </div>
              <SimpleTooltip text="ดูเทียร์ลิสต์ของคอนเทนต์นี้ทั้งหมด">
                <span className="absolute right-0 m-8 text-sm font-normal text-blue-400 ml-2 hover:underline ">
                  ดูทั้งหมด
                  <ArrowRight className="inline-block size-4" />
                </span>
              </SimpleTooltip>
            </div>
          </Link>
          <HorizontalDiv>
            <div className="flex gap-2 max-w-full">
              {t.versions.map((e) => (
                <Link href={`/tl/${t.id}/${e.id}`} key={e.id}>
                  {e.image ? (
                    <div className="relative aspect-video w-60 rounded-sm border">
                      <Image
                        src={`/cdn/${e.image}`}
                        alt={e.name}
                        fill
                        className="rounded-sm border object-cover bg-primary"
                      />
                      <div className="flex absolute w-full justify-center bottom-0 py-1 bg-black/50 rounded-b-sm">
                        {e.name}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center aspect-video w-60 border rounded-sm bg-[#1118] backdrop-blur-xl font-bold text-4xl">
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
