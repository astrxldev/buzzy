import { desc, eq } from "drizzle-orm";
import { ExternalLink, Lock, PencilLine, PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { db } from "@/lib/db";
import {
  tierlistBadges,
  tierlistTypes,
  tierlistVersions,
} from "@/lib/db/schema";
import { syncTierlistSnapshots } from "@/lib/tierlist";
import { cn } from "@/lib/utils";
import { BadgeSection } from "./badge-section";

export default async function TierlistManagerPage({
  params,
}: PageProps<"/admin/tl/[ver]">) {
  const { ver } = await params;
  await syncTierlistSnapshots(ver);
  const [[type], versionsList, badges] = await Promise.all([
    db.select().from(tierlistTypes).where(eq(tierlistTypes.id, ver)),
    db
      .select()
      .from(tierlistVersions)
      .orderBy(desc(tierlistVersions.order))
      .where(eq(tierlistVersions.type, ver)),
    db
      .select()
      .from(tierlistBadges)
      .orderBy(tierlistBadges.order, tierlistBadges.id),
  ]);
  const t = {
    ...type,
    versions: versionsList,
  };
  return (
    <div className="mx-2 flex grow-0 flex-col gap-2 pt-5">
      <div className="group/type flex flex-col gap-1">
        <div className="flex w-fit flex-wrap items-center gap-2 text-4xl font-semibold">
          <div className="flex flex-auto flex-wrap items-baseline gap-x-2 rounded-md border bg-[#2228] px-2 py-1">
            <span className="text-nowrap">{t.name}</span>
            <span className="flex items-center gap-1">
              <Kbd>{t.id}</Kbd>
              <span className="text-xs text-muted-foreground">{t.mode}</span>
            </span>
          </div>
          <div className="flex gap-1 transition-opacity group-hover/type:opacity-100 md:opacity-0">
            <SimpleTooltip text="Add version">
              <Button asChild>
                <Link href={`/admin/tl/ver/${t.id}/create`}>
                  <PlusIcon />
                  <span className="md:hidden">Add</span>
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
        <div className="flex flex-wrap gap-2">
          {t.versions.map((e) => (
            <div
              key={e.id}
              className={cn(
                e.image
                  ? "group/ver relative aspect-video w-[calc(100svw-16px)] rounded-sm border md:w-60"
                  : "group/ver relative flex aspect-video w-[calc(100svw-16px)] items-center justify-center rounded-sm border bg-[#1118] text-4xl font-bold backdrop-blur-xl md:w-60",
                e.hidden && "opacity-50",
              )}
            >
              {e.image ? (
                <>
                  <Image
                    src={`/cdn/${e.image}`}
                    alt={e.name}
                    fill
                    className="-z-1 rounded-sm border bg-primary object-cover"
                  />
                  <div className="absolute bottom-0 flex w-full justify-center gap-1 rounded-b-sm bg-card py-1">
                    {e.name} <Kbd>{e.id}</Kbd>
                  </div>
                </>
              ) : (
                e.name
              )}
              <div className="absolute top-1 right-1 flex gap-1 transition-opacity group-hover/ver:opacity-100 md:opacity-0">
                <SimpleTooltip text="Open in admin">
                  <Button variant="outline" asChild className="bg-card!">
                    <Link href={`/tl/${t.id}/${e.id}/admin`} target="_blank">
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
              {e.snapshot && (
                <div className="absolute right-1 bottom-1 rounded-sm border bg-card/90 p-1 text-muted-foreground">
                  <SimpleTooltip text="This version is using a frozen snapshot">
                    <Lock className="size-4" />
                  </SimpleTooltip>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="h-px bg-foreground/25"></div>
      <div className="flex">
        <div className="flex flex-1 flex-col gap-2">
          <BadgeSection
            typeId={ver}
            typeName={type.name}
            badges={badges.filter((badge) => (badge.type ?? ver) === ver)}
          />
        </div>
        <div className="flex flex-2"></div>
      </div>
    </div>
  );
}
