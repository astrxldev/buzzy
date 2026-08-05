"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DraggableAttributes,
  DragOverlay,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { useState } from "react";

export function SortableGrid({
  items,
  onReorder,
  children,
  overlay,
  disabled = false,
}: {
  items: string[];
  onReorder: (activeId: string, overId: string) => void;
  children?: ReactNode;
  overlay?: (id: string) => ReactNode;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState<string | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    if (disabled || !event.over) return;
    onReorder(event.active.id as string, event.over.id as string);
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={(event) => setDragging(event.active.id as string)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay>{dragging && overlay?.(dragging)}</DragOverlay>
    </DndContext>
  );
}

export function SortableGridItem({
  id,
  disabled = false,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (props: {
    listeners: SyntheticListenerMap | undefined;
    attributes: DraggableAttributes | undefined;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties | undefined;
    isDragging: boolean;
  }) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return children({
    listeners,
    attributes,
    setNodeRef,
    isDragging,
    style: {
      transform: transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
        : undefined,
      transition,
      opacity: isDragging ? 0.5 : 1,
    },
  });
}
