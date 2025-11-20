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
        "blocker backdrop-blur-sm bg-[#2225] flex justify-center items-center absolute top-[-5px] left-[-5px] bottom-[-5px] right-[-5px] rounded-sm z-45 border-t-gray-700 border-l-gray-600 border-1",
        inner && "rounded-none top-0 left-0 bottom-0 right-0",
        className,
      )}
      {...props}
    >
      {fail ? (
        <div className="bg-[#2222] p-2 rounded border flex items-center gap-2">
          <CircleX size={24} className="text-red-400" />
          <div>{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
