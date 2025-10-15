"use client";

import type { ColumnDef } from "@tanstack/react-table";

export const cdnColumns: ColumnDef<{
  id: string;
  name: string | null;
  size: string;
}>[] = [
  {
    accessorFn: (row) => row.name || `[${row.id}]`,
    header: "Name",
  },
  {
    accessorFn: (row) => b2s(Number(row.size)),
    header: "Size",
  },
];

const b2s = (t: number) => {
  let e = (Math.log2(t) / 10) | 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: copied
  return `${(t / 1024 ** (e = e <= 0 ? 0 : e)).toFixed(1)}${" KMGP"[e]}B`;
};
