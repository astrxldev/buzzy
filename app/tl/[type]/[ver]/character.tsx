"use client";

import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";
import { useContext } from "react";
import type { characters } from "@/lib/db/schema";
import { TierListContext } from "./context";

export function Draggable({ char }: { char: typeof characters.$inferSelect }) {
  const { tileSize } = useContext(TierListContext);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: char.id,
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Image
        src={`/cdn/${char.image}`}
        style={{
          background: `rgba(${
            char.stars === 5
              ? "200,124,36"
              : char.stars === 4
                ? "148,112,187"
                : "100,100,100"
          }) linear-gradient(136deg,rgba(49,43,71,.5294117647058824),transparent)`,
        }}
        className="rounded"
        alt={char.name}
        height={tileSize}
        width={tileSize}
      />
    </button>
  );
}
