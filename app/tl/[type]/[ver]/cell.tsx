"use client";

import { useDroppable } from "@dnd-kit/core";
import { type ReactNode, useContext } from "react";
import type { tierlistColumns, tierlistTiers } from "@/lib/db/schema";
import { TierListContext } from "./context";

export function TierListCell({
  tier,
  column,
  children,
}: {
  tier: typeof tierlistTiers.$inferSelect;
  column: typeof tierlistColumns.$inferSelect;
  children?: ReactNode;
}) {
  const { tileSize } = useContext(TierListContext);

  const { setNodeRef } = useDroppable({
    id: `${tier.id}-${column.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-wrap p-1 gap-2 items-start"
      style={{
        minHeight: `${tileSize + 8}px`,
      }}
    >
      {children}
    </div>
  );
}
