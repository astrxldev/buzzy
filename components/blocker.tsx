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
        "blocker absolute top-[-5px] right-[-5px] bottom-[-5px] left-[-5px] z-45 flex items-center justify-center rounded-sm border-1 border-t-gray-700 border-l-gray-600 bg-[#2225] backdrop-blur-sm",
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
