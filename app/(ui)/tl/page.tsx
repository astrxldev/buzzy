import { desc, not } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/image";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";
import TierlistLogo from "#/logos/tierlist.webp";

export const metadata: Metadata = {
  title: "จัดเทียร์ลิสต์",
  description: "ระบบจัดเทียร์ลิสต์ตัวละครของคอนเท้นเอนเกม",
};

export default async function TierlistSelectionPage() {
  const types = await db.select().from(tierlistTypes).orderBy(tierlistTypes.id);
  const versionsList = await db
    .select()
    .from(tierlistVersions)
    .orderBy(desc(tierlistVersions.order))
    .where(not(tierlistVersions.hidden));
  const vers = types.map((t) => ({
    ...t,
    versions: versionsList.filter((v) => v.type === t.id),
  }));
  return (
    <div className="max-w-full min-h-full flex flex-col justify-center gap-2 mx-2">
      <center className="text-6xl font-bold mb-2">
            <Link href="/">
              <Image
                src={TierlistLogo}
                alt="Tierlist"
                className="rounded-t-x w-3/4 sm:w-96"
                width={500}
                height={100}
                fetchPriority="high"
              />
            </Link>
      </center>
      {vers.map((t) => (
        <div className="flex flex-col gap-1" key={t.id}>
          <div className="font-bold text-4xl">
            <div className="px-2 py-1 border w-min rounded-md bg-[#2228]">
              {t.name}
            </div>
          </div>
          <ScrollArea>
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
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
