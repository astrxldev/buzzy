"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function SimpleTooltip({
  text,
  children,
  side,
  ...props
}: {
  text?: ReactNode;
  side?: "top" | "right" | "bottom" | "left" | undefined;
} & React.ComponentProps<typeof Tooltip>) {
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{text}</TooltipContent>
    </Tooltip>
  );
}
