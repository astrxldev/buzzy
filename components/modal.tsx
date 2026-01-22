"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ModalBase({
  children,
  title,
  wrap,
  full,
}: {
  children: React.ReactNode;
  title: string;
  wrap?: boolean;
  full?: boolean;
}) {
  const router = useRouter();

  return (
    <Dialog open={true} onOpenChange={() => router.back()}>
      <DialogContent
        className={cn(
          wrap && "p-0",
          full && "h-full max-w-dvw! flex flex-col lg:max-w-[90%]! lg:h-[90%]",
        )}
      >
        <DialogHeader className={cn(wrap && "sr-only hidden")}>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
