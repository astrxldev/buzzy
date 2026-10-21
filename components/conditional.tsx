"use client";

import type { MaybePromise } from "bun";
import { use, type ReactNode } from "react";

export function Conditional({
  children,
  c,
}: {
  children: ReactNode;
  c: MaybePromise<any>;
}) {
  const val = use(c);
  return !!val && children;
}
