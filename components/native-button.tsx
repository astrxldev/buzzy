"use client";

import type { ComponentRef } from "react";
import { useEffect, useRef, type ComponentProps } from "react";
import type { Button } from "./ui/button";

// use direct event attach to work in D-PIP
// not needed anymore cause dpip.tsx rw

type NativeButtonProps<T extends React.ElementType = "button"> = {
  as?: T;
} & Omit<ComponentProps<T>, "as"> &
  Omit<ComponentProps<typeof Button>, "ref">;

export function NativeButton<T extends React.ElementType = "button">({
  onClick,
  ref: parentRef,
  as,
  ...props
}: NativeButtonProps<T>) {
  const ref = useRef<ComponentRef<T>>(null);
  const combineRef = (n: ComponentRef<T>) =>
    ((ref.current = n) &&
      (typeof parentRef === "function"
        ? parentRef(n)
        : parentRef && (parentRef.current = n)) &&
      null) as void;
  useEffect(() => {
    if (!ref.current) return;
    (ref.current as any).onclick = onClick as unknown as (
      ev: PointerEvent,
    ) => void;
    // console.log("EVENT LISTENRE ATTCHED");
  }, [onClick]);
  const Comp = as ?? "button";
  return <Comp ref={combineRef as any} {...props} />;
}
