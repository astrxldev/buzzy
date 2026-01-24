import { desc, not } from "drizzle-orm";
import { ExternalLink, PencilLine, PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";

export default async function TierlistManagerPage() {
  const types = await db.select().from(tierlistTypes).orderBy(tierlistTypes.id);
  const versionsList = await db
    .select()
    .from(tierlistVersions)
    .orderBy(desc(tierlistVersions.id))
    .where(not(tierlistVersions.hidden));
  const vers = types.map((t) => ({
    ...t,
    versions: versionsList.filter((v) => v.type === t.id),
  }));

  return (
    <div className="grow-0 flex flex-col pt-5 gap-2 mx-2">
      <Button className="w-fit" asChild>
        <Link href={`/admin/tl/ver/create`}>
          <PlusIcon />
          <span>Create</span>
        </Link>
      </Button>
      {vers.map((t) => (
        <div className="flex flex-col gap-1 group/type" key={t.id}>
          <div className="font-bold text-4xl flex items-center gap-2">
            <div className="px-2 py-1 border w-min rounded-md bg-[#2228] flex">
              {t.name} <Kbd>{t.id}</Kbd>
            </div>
            <div className="md:opacity-0 group-hover/type:opacity-100 transition-opacity flex gap-1">
              <SimpleTooltip text="Create version">
                <Button asChild>
                  <Link href={`/admin/tl/${t.id}/create`}>
                    <PlusIcon />
                    <span className="md:hidden">Create</span>
                  </Link>
                </Button>
              </SimpleTooltip>
              <SimpleTooltip text="Edit type">
                <Button variant="outline" asChild>
                  <Link href={`/admin/tl/ver/${t.id}/edit`}>
                    <PencilLine />
                    <span className="md:hidden">Edit</span>
                  </Link>
                </Button>
              </SimpleTooltip>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {t.versions.map((e) => (
              <div
                key={e.id}
                className={
                  e.image
                    ? "relative aspect-video w-[calc(100svw-16px)] md:w-60 rounded-sm border group/ver"
                    : "relative flex items-center justify-center aspect-video w-[calc(100svw-16px)] md:w-60 border rounded-sm bg-[#1118] backdrop-blur-xl font-bold text-4xl group/ver"
                }
              >
                {e.image ? (
                  <>
                    <Image
                      src={`/cdn/${e.image}`}
                      alt={e.name}
                      fill
                      className="rounded-sm border object-cover bg-primary -z-1"
                    />
                    <div className="flex absolute w-full justify-center bottom-0 py-1 bg-card rounded-b-sm gap-1">
                      {e.name} <Kbd>{e.id}</Kbd>
                    </div>
                  </>
                ) : (
                  e.name
                )}
                <div className="md:opacity-0 group-hover/ver:opacity-100 transition-opacity flex gap-1 absolute top-1 right-1">
                  <SimpleTooltip text="Open in admin">
                    <Button variant="outline" asChild className="bg-card!">
                      <Link href={`/tl/${t.id}/${e.id}/admin`}>
                        <ExternalLink />
                        <span className="md:hidden">Open</span>
                      </Link>
                    </Button>
                  </SimpleTooltip>
                  <SimpleTooltip text="Edit version">
                    <Button variant="outline" asChild className="bg-card!">
                      <Link href={`/admin/tl/ver/${t.id}/${e.id}/edit`}>
                        <PencilLine />
                        <span className="md:hidden">Edit</span>
                      </Link>
                    </Button>
                  </SimpleTooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
