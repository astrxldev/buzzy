"use client";

import type { MaybePromise } from "bun";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ActionSubmitContext } from "./action-submit-provider";

export function ActionButton({
  action,
  children,
  onClick,
  text,
  ...props
}: ComponentProps<typeof Button> & {
  action: (() => MaybePromise<void>) | "provider";
  text?: string;
}) {
  const [state, setState] = useState<0 | 1 | 2>(0);
  const ctx = use(ActionSubmitContext);

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
        setState(1);
        if (action === "provider")
          await new Promise<void>(ctx.listenForComplete);
        onClick?.(ev);
        try {
          if (action !== "provider") await action();
          setState(2);
        } catch (e) {
          toast.error("An error occured!");
          console.error(e);
          setState(0);
        }
      }}
    >
      {state === 0 ? children : state === 1 ? <Spinner /> : <Check />} {text}
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
