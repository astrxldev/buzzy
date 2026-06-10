import { CircleX } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

export function Blocker({
  children,
  fail = false,
  inner = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { inner?: boolean; fail?: boolean }) {
  return (
    <div
      className={cn(
        "blocker absolute -top-1.25 -right-1.25 -bottom-1.25 -left-1.25 z-45 flex items-center justify-center rounded-sm border border-t-gray-700 border-l-gray-600 bg-[#2225] backdrop-blur-sm",
        inner && "top-0 right-0 bottom-0 left-0 rounded-none",
        className,
      )}
      {...props}
    >
      {fail ? (
        <div className="flex items-center gap-2 rounded border bg-[#2222] p-2">
          <CircleX size={24} className="text-red-400" />
          <div>{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
