import { desc, eq, not } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/image";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";
import { ArrowLeft } from "lucide-react";

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
  const types = await db
    .select()
    .from(tierlistTypes)
    .where(eq(tierlistTypes.id, typeId));
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
    <div className="max-w-7xl min-h-full flex flex-col gap-6 mx-auto py-8 px-4">
      {vers.map((t) => (
        <div className="flex flex-col gap-1" key={t.id}>
          <Link href="/tl" className="flex hover:underline cursor-default text-muted-foreground">
            <ArrowLeft/> กลับไปหน้าแรก
          </Link>
          <div className="font-bold text-4xl">
            <div className="px-2 py-1 border w-fit rounded-md bg-[#2228]">
              {t.name}
              <span className="text-sm text-muted-foreground ml-2">
                {t.mode}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {t.versions.map((e) => (
              <Link href={`/tl/${t.id}/${e.id}`} key={e.id}>
                {e.image ? (
                  <div className="relative aspect-video w-full rounded-lg border overflow-hidden">
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
        </div>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
