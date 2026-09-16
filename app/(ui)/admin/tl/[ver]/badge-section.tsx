"use client";

import { GripVertical, PencilLine, PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import type { tierlistBadges } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { reorderFlatItems } from "../components/order";
import { SortableGrid, SortableGridItem } from "../components/sortable-grid";
import { reorderBadges } from "./actions";

export function BadgeSection({
  typeId,
  typeName,
  badges: initialBadges,
}: {
  typeId: string;
  typeName: string;
  badges: (typeof tierlistBadges.$inferSelect)[];
}) {
  const [badges, setBadges] = useState(initialBadges);
  const [pending, startTransition] = useTransition();
  const badgeSize = 48;

  function commitReorder(activeId: string, overId: string) {
    const next = reorderFlatItems(badges, activeId, overId);
    if (next === badges) return;

    const previous = badges;
    setBadges(next);

    startTransition(() => {
      reorderBadges({
        typeId,
        activeId,
        ids: next.map((badge) => badge.id),
      }).catch((error) => {
        console.error(error);
        setBadges(previous);
        toast.error(
          error instanceof Error ? error.message : "Failed to reorder badges.",
        );
      });
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-1 rounded-md border bg-card/50 p-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          Badges
          <span className="text-muted-foreground">
            (blue = global, green = {typeName} local)
          </span>
        </span>
        <Button size="sm" asChild>
          <Link href={`/admin/tl/badge/${typeId}/create`}>
            <PlusIcon /> Add badge
          </Link>
        </Button>
      </div>
      <SortableGrid
        items={badges.map((badge) => badge.id)}
        onReorder={commitReorder}
        disabled={pending}
        overlay={(id) => {
          const badge = badges.find((entry) => entry.id === id);
          return badge ? (
            <BadgeTile
              badge={badge}
              typeId={typeId}
              badgeSize={badgeSize}
              overlay
            />
          ) : null;
        }}
      >
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <SortableGridItem key={badge.id} id={badge.id} disabled={pending}>
              {({ attributes, listeners, setNodeRef, style, isDragging }) => (
                <div
                  ref={setNodeRef}
                  style={style}
                  className={cn(isDragging && "z-10")}
                >
                  <BadgeTile
                    badge={badge}
                    typeId={typeId}
                    badgeSize={badgeSize}
                    dragHandle={{ ...attributes, ...listeners }}
                  />
                </div>
              )}
            </SortableGridItem>
          ))}
        </div>
      </SortableGrid>
    </div>
  );
}

function BadgeTile({
  badge,
  typeId,
  badgeSize,
  dragHandle,
  overlay = false,
}: {
  badge: typeof tierlistBadges.$inferSelect;
  typeId: string;
  badgeSize: number;
  dragHandle?: ComponentProps<"button">;
  overlay?: boolean;
}) {
  const borderClass =
    badge.type === null ? "border-blue-500" : "border-emerald-400";

  return (
    <div className="group/badge relative">
      <button
        type="button"
        className="absolute top-1 left-1 z-10 cursor-grab rounded-sm border bg-card/90 p-0.5 text-muted-foreground active:cursor-grabbing"
        {...dragHandle}
      >
        <GripVertical className="size-3" />
      </button>
      {!overlay && (
        <div className="absolute top-1 right-1 z-10 opacity-0 transition-opacity group-hover/badge:opacity-100">
          <SimpleTooltip text="Edit badge">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="size-6 bg-card!"
            >
              <Link href={`/admin/tl/badge/${typeId}/${badge.id}/edit`}>
                <PencilLine className="size-3" />
              </Link>
            </Button>
          </SimpleTooltip>
        </div>
      )}
      {badge.image ? (
        <Image
          className={cn(
            "rounded border bg-[#2225] backdrop-blur-sm",
            borderClass,
            overlay && "shadow-lg",
          )}
          src={`/cdn/${badge.image}`}
          alt={badge.name}
          width={badgeSize}
          height={badgeSize}
        />
      ) : (
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className={cn(
            "flex items-center justify-center rounded border bg-[#2228] px-1 text-center text-xs font-bold",
            borderClass,
            overlay && "shadow-lg",
          )}
        >
          {badge.name}
        </div>
      )}
    </div>
  );
}
