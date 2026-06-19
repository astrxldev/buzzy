"use client";

import type { MaybePromise } from "bun";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ActionButton({
  action,
  children,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { action: () => MaybePromise<void> }) {
  const [state, setState] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (state !== 2) return;
    const tm = setTimeout(() => setState(0), 2000);
    return () => clearTimeout(tm);
  });
  return (
    <Button
      disabled={state > 0}
      {...props}
      onClick={async (ev) => {
        onClick?.(ev);
        setState(1);
        try {
          await action();
          setState(2);
        } catch (e) {
          toast.error("An error occured!");
          console.error(e);
          setState(0);
        }
      }}
    >
      {state === 0 ? children : state === 1 ? <Spinner /> : <Check />}
    </Button>
  );
}

export function MaybeWrap({
  wrap,
  wrapper,
  children,
}: {
  wrap: boolean;
  wrapper: (props: { children?: ReactNode }) => ReactNode;
  children?: ReactNode;
}) {
  return wrap ? wrapper({ children }) : children;
}
