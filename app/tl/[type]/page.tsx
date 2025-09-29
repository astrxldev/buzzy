import { and, eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";

export default async function TierlistSelectionPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: typeName } = await params;
  const [type] = await db
    .select()
    .from(tierlistTypes)
    .where(and(eq(tierlistTypes.id, typeName)));
  if (!type) notFound();
  const versions = await db
    .select()
    .from(tierlistVersions)
    .where(
      and(
        eq(tierlistVersions.hidden, false),
        eq(tierlistVersions.type, typeName),
      ),
    );
  return (
    <div className="w-full min-h-full flex justify-center">
      <div className="min-h-full flex flex-col items-center justify-center gap-2">
        <div className="grid gap-1">
          <center className="font-bold text-4xl">{type.name}</center>
          <div className="flex gap-2 flex-wrap justify-center">
            {[
              ...versions.map((e) => ({ ...e, id: `${e.id}1` })),
              ...versions.map((e) => ({ ...e, id: `${e.id}2` })),
              ...versions.map((e) => ({ ...e, id: `${e.id}3` })),
              ...versions.map((e) => ({ ...e, id: `${e.id}4` })),
              ...versions.map((e) => ({ ...e, id: `${e.id}6` })),
            ].map((e) =>
              e.image ? (
                <Link href={`/tl/${type.id}/${e.id}`} key={e.id}>
                  <div className="relative aspect-video w-80 rounded-sm border">
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
                </Link>
              ) : (
                <Link href={`/tl/${type.id}/${e.id}`} key={e.id}>
                  <div className="flex items-center justify-center aspect-video w-80 border rounded-sm bg-[#1118] backdrop-blur-xl font-bold text-4xl">
                    {e.name}
                  </div>
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
