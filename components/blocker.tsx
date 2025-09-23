import type { ReactNode } from "react";

export function Blocker({ children }: { children: ReactNode }) {
  return (
    <div className="blocker backdrop-blur-xl bg-[#222A] flex justify-center items-center absolute top-[-5px] left-[-5px] bottom-[-5px] right-[-5px] rounded-sm z-100 border-t-gray-700 border-l-gray-600 border-1">
      {children}
    </div>
  );
}
