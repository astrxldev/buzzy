import { Check, CircleAlert, CircleX, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "info" | "warning" | "error";

const toastStyles: Record<ToastType, string> = {
  success: "border-emerald-950 bg-emerald-950/70 text-emerald-300",
  info: "border-blue-950 bg-blue-950/70 text-blue-300",
  warning: "border-yellow-950 bg-yellow-950/70 text-yellow-200",
  error: "border-red-950 bg-red-950/70 text-red-200",
};

const toastIcons: Record<ToastType, React.ElementType> = {
  success: Check,
  info: Info,
  warning: CircleAlert,
  error: CircleX,
};

export function FakeToast({
  type = "success",
  children,
  onIconClick,
}: {
  type?: ToastType;
  children: React.ReactNode;
  onIconClick?: () => void;
}) {
  const Icon = toastIcons[type];

  return (
    <div
      className={cn(
        "flex w-80 items-center gap-2 rounded-lg border p-4 shadow-[0_4px_12px_rgb(0_0_0/0.3)] backdrop-blur-xs",
        toastStyles[type],
      )}
    >
      {onIconClick ? (
        <button
          type="button"
          aria-label="Change toast type"
          onClick={onIconClick}
          className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <Icon
            aria-hidden="true"
            className="-m-2 size-8 rounded-full p-2 transition-colors hover:bg-current/20"
            strokeWidth={2}
          />
        </button>
      ) : (
        <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
      )}
      {children}
    </div>
  );
}
