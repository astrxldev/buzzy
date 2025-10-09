"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function SimpleTooltip({
  text,
  children,
  ...props
}: { text: string } & React.ComponentProps<typeof Tooltip>) {
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
