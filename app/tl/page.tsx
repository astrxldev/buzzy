import { desc } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";

export default async function TierlistSelectionPage() {
  const types = await db.select().from(tierlistTypes).orderBy(tierlistTypes.id);
  const versionsList = await db
    .select()
    .from(tierlistVersions)
    .orderBy(desc(tierlistVersions.id));
  const vers = types.map((t) => ({
    ...t,
    versions: versionsList.filter((v) => v.type === t.id),
  }));
  return (
    <div className="max-w-full min-h-full flex flex-col justify-center gap-2 mx-2">
      <center className="text-6xl font-bold mb-8">
        <Link href="/">จัดเทียร์ลิสต์</Link>
      </center>
      {vers.map((t) => (
        <div className="flex flex-col gap-1" key={t.id}>
          <div className="font-bold text-4xl">
            <div className="px-2 py-1 border border-dashed w-min rounded-md bg-[#2228]">
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
                      <div className="flex absolute w-full justify-center bottom-0 py-1 bg-card rounded-b-sm">
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
