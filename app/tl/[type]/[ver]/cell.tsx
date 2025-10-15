"use client";

import { type DraggableAttributes, useDroppable } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactNode, useContext } from "react";
import type { tierlistColumns, tierlistTiers } from "@/lib/db/schema";
import { TierListContext } from "./context";

export function TierListCell({
  tier,
  column,
  children,
  items, // Array of character IDs in this cell
}: {
  tier: typeof tierlistTiers.$inferSelect;
  column: typeof tierlistColumns.$inferSelect;
  children?: ReactNode;
  items: string[]; // Add this prop
}) {
  const { tileSize } = useContext(TierListContext);
  const cellId = `${tier.id}-${column.id}`;

  const { setNodeRef } = useDroppable({
    id: cellId,
  });

  return (
    <SortableContext id={cellId} items={items} strategy={rectSortingStrategy}>
      <div
        ref={setNodeRef}
        className="flex flex-wrap p-1 gap-2 items-start"
        style={{
          minHeight: `${tileSize + 8}px`,
        }}
      >
        {children}
      </div>
    </SortableContext>
  );
}

// Wrapper component for sortable draggable items
export function SortableDraggable({
  id,
  children,
}: {
  id: string;
  children: (props: {
    listeners: SyntheticListenerMap | undefined;
    attributes: DraggableAttributes | undefined;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties | undefined;
  }) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return children({ listeners, attributes, setNodeRef, style });
}
