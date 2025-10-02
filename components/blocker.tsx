import { CircleX } from "lucide-react";
import type React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Blocker({
  children,
  fail = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { children: ReactNode; fail?: boolean }) {
  return (
    <div
      className={cn(
        "blocker backdrop-blur-sm bg-[#2225] flex justify-center items-center absolute top-[-5px] left-[-5px] bottom-[-5px] right-[-5px] rounded-sm z-45 border-t-gray-700 border-l-gray-600 border-1",
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
