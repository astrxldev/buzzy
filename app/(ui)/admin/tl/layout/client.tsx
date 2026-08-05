"use client";

import { GripVertical, PencilLine, PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import type { tierlistColumns, tierlistTiers } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { reorderFlatItems } from "../components/order";
import { SortableGrid, SortableGridItem } from "../components/sortable-grid";
import { reorderColumns, reorderTiers } from "./actions";

type Tier = typeof tierlistTiers.$inferSelect;
type Column = typeof tierlistColumns.$inferSelect;

export function LayoutEditor({
  tiers: initialTiers,
  columns: initialColumns,
}: {
  tiers: Tier[];
  columns: Column[];
}) {
  const [tiers, setTiers] = useState(initialTiers);
  const [columns, setColumns] = useState(initialColumns);
  const [pending, startTransition] = useTransition();

  function commitReorder<T extends { id: string }>(
    items: T[],
    setItems: (items: T[]) => void,
    activeId: string,
    overId: string,
    persist: (args: { activeId: string; ids: string[] }) => Promise<void>,
    label: string,
  ) {
    const next = reorderFlatItems(items, activeId, overId);
    if (next === items) return;

    const previous = items;
    setItems(next);

    startTransition(() => {
      persist({ activeId, ids: next.map((item) => item.id) }).catch((error) => {
        console.error(error);
        setItems(previous);
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to reorder ${label}.`,
        );
      });
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="grid min-w-fit *:border *:border-white/10"
          style={{
            gridTemplateColumns: `minmax(180px, 240px) repeat(${Math.max(columns.length, 1)}, minmax(180px, 1fr)) 72px`,
            gridTemplateRows: `minmax(88px, auto) repeat(${Math.max(tiers.length, 1)}, minmax(108px, auto)) 72px`,
          }}
        >
          <div className="bg-[#0005]" />

          <SortableGrid
            items={columns.map((column) => column.id)}
            onReorder={(activeId, overId) =>
              commitReorder(
                columns,
                setColumns,
                activeId,
                overId,
                reorderColumns,
                "columns",
              )
            }
            disabled={pending}
            overlay={(id) => {
              const column = columns.find((entry) => entry.id === id);
              return column ? (
                <LayoutNode
                  item={column}
                  href={`/admin/tl/layout/column/${column.id}/edit`}
                  orientation="column"
                  overlay
                />
              ) : null;
            }}
          >
            {columns.length ? (
              columns.map((column) => (
                <SortableGridItem
                  key={column.id}
                  id={column.id}
                  disabled={pending}
                >
                  {({
                    attributes,
                    listeners,
                    setNodeRef,
                    style,
                    isDragging,
                  }) => (
                    <div
                      ref={setNodeRef}
                      style={style}
                      className={cn(isDragging && "z-10")}
                    >
                      <LayoutNode
                        item={column}
                        href={`/admin/tl/layout/column/${column.id}/edit`}
                        orientation="column"
                        dragHandle={{ ...attributes, ...listeners }}
                      />
                    </div>
                  )}
                </SortableGridItem>
              ))
            ) : (
              <div className="flex items-center justify-center bg-[#0005] p-3 text-sm text-muted-foreground">
                Add your first column
              </div>
            )}
          </SortableGrid>

          <AddSlot href="/admin/tl/layout/column/create" label="Add column" />

          {tiers.length ? (
            <SortableGrid
              items={tiers.map((tier) => tier.id)}
              onReorder={(activeId, overId) =>
                commitReorder(
                  tiers,
                  setTiers,
                  activeId,
                  overId,
                  reorderTiers,
                  "tiers",
                )
              }
              disabled={pending}
              overlay={(id) => {
                const tier = tiers.find((entry) => entry.id === id);
                return tier ? (
                  <LayoutNode
                    item={tier}
                    href={`/admin/tl/layout/tier/${tier.id}/edit`}
                    orientation="tier"
                    badges={tier.badges}
                    overlay
                  />
                ) : null;
              }}
            >
              {tiers.map((tier) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  columnIds={
                    columns.length
                      ? columns.map((column) => column.id)
                      : ["empty"]
                  }
                  pending={pending}
                />
              ))}
            </SortableGrid>
          ) : (
            <>
              <div className="flex items-center justify-center bg-[#0005] p-3 text-sm text-muted-foreground">
                Add your first tier
              </div>
              {(columns.length
                ? columns.map((column) => column.id)
                : ["empty"]
              ).map((id) => (
                <BlankCell key={`empty-tier-cell-${id}`} />
              ))}
            </>
          )}

          <AddSlot href="/admin/tl/layout/tier/create" label="Add tier" />
          {(columns.length
            ? columns.map((column) => column.id)
            : ["empty"]
          ).map((id) => (
            <ThinCell key={`footer-${id}`} />
          ))}
          <ThinCell />
        </div>
      </div>
    </div>
  );
}

function TierRow({
  tier,
  columnIds,
  pending,
}: {
  tier: Tier;
  columnIds: string[];
  pending: boolean;
}) {
  return (
    <>
      <SortableGridItem id={tier.id} disabled={pending}>
        {({ attributes, listeners, setNodeRef, style, isDragging }) => (
          <div
            ref={setNodeRef}
            style={style}
            className={cn(isDragging && "z-10")}
          >
            <LayoutNode
              item={tier}
              href={`/admin/tl/layout/tier/${tier.id}/edit`}
              orientation="tier"
              badges={tier.badges}
              dragHandle={{ ...attributes, ...listeners }}
            />
          </div>
        )}
      </SortableGridItem>
      {columnIds.map((columnId) => (
        <BlankCell key={`${tier.id}-${columnId}`} />
      ))}
      <BlankCell />
    </>
  );
}

function BlankCell() {
  return <div className="min-h-27 bg-[#0003]" />;
}

function ThinCell() {
  return <div className="min-h-18 bg-[#0003]" />;
}

function AddSlot({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group/add flex items-center justify-center bg-[#0004] text-muted-foreground transition-colors hover:bg-[#0007] hover:text-foreground"
    >
      <SimpleTooltip text={label}>
        <PlusIcon className="size-8 transition-transform group-hover/add:scale-110" />
      </SimpleTooltip>
    </Link>
  );
}

function LayoutNode({
  item,
  href,
  dragHandle,
  orientation,
  badges,
  overlay = false,
}: {
  item: { id: string; name: string; image: string | null };
  href?: string;
  dragHandle?: ComponentProps<"button">;
  orientation: "tier" | "column";
  badges?: string[] | null;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "group/layout relative flex h-full min-h-22 items-center gap-3 bg-[#0005] p-3",
        overlay && "shadow-lg",
        orientation === "column" && "justify-center text-center",
      )}
    >
      <button
        type="button"
        className="absolute top-2 left-2 z-10 cursor-grab rounded-sm border bg-card/90 p-0.5 text-muted-foreground active:cursor-grabbing"
        {...dragHandle}
      >
        <GripVertical className="size-3" />
      </button>
      {href && !overlay && (
        <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover/layout:opacity-100">
          <SimpleTooltip text="Edit">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="size-7 bg-card!"
            >
              <Link href={href}>
                <PencilLine className="size-3" />
              </Link>
            </Button>
          </SimpleTooltip>
        </div>
      )}
      <div
        className={cn(
          "flex size-16 shrink-0 items-center justify-center rounded border bg-[#2228]",
          orientation === "column" && "mx-auto mt-3",
        )}
      >
        {item.image ? (
          <Image
            src={`/cdn/${item.image}`}
            alt={item.name}
            width={64}
            height={64}
            className="max-h-16 w-auto object-contain"
          />
        ) : (
          <span className="text-xl font-bold">{item.name[0] ?? "?"}</span>
        )}
      </div>
      <div className={cn("min-w-0", orientation === "column" && "w-full")}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="truncate text-lg font-semibold">{item.name}</div>
          <Kbd>{item.id}</Kbd>
        </div>
        {orientation === "tier" && (
          <div className="mt-1 flex flex-wrap gap-1">
            {badges?.length ? (
              <KbdGroup className="flex-wrap gap-1">
                {badges.map((badge) => (
                  <Kbd key={badge}>{badge}</Kbd>
                ))}
              </KbdGroup>
            ) : (
              <span className="text-sm text-muted-foreground">No badges</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
