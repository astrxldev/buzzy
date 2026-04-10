"use client";

import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import { type ComponentProps, useRef } from "react";

export function HorizontalDiv({
  magnitude = 4,
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.Viewport> & {
  magnitude?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className="relative">
      <ScrollAreaPrimitive.Viewport
        ref={ref}
        {...props}
        onWheel={(ev) => {
          if (ref.current)
            ref.current.scrollTo({
              left: ref.current.scrollLeft + ev.deltaY * magnitude,
              behavior: "smooth",
            });
        }}
      />
    </ScrollAreaPrimitive.Root>
  );
}
