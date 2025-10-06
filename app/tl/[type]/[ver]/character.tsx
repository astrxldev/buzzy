"use client";

import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";
import { useContext, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { characters } from "@/lib/db/schema";
import { TierListContext } from "./context";

export function Draggable({ char }: { char: typeof characters.$inferSelect }) {
  const { tileSize, badgeSize } = useContext(TierListContext);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: char.id,
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <Popover open={panelOpen} onOpenChange={setPanelOpen}>
      <PopoverTrigger asChild>
        <button
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          onContextMenu={(ev) => {
            ev.preventDefault();
            setPanelOpen((x) => !x);
          }}
        >
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
      </PopoverTrigger>
      <PopoverContent side="right" className="bg-[#2225] backdrop-blur-md p-1">
        <div className="flex gap-2">
          <div className="grid grid-cols-2 gap-1 border border-dashed rounded p-1">
            {Array(12)
              .fill(0)
              .map((_, i) => ({
                id: i,
                name: "A+",
                image: "0199946b-666c-717f-a42b-c4ca067c3e39",
                order: i,
              }))
              .map((e) => (
                <Image
                  src={`/cdn/${e.image}`}
                  alt={e.name}
                  key={`B${e.id}`}
                  width={48}
                  height={48}
                  className="border rounded hover:brightness-110"
                />
              ))}
          </div>
          <Textarea
            placeholder="Comment..."
            className="aspect-square bg-card resize-none"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
