"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tantable";

type NumberString = `${number}`;
type NumberLike = number | NumberString;

interface TopDonateRow {
  i: NumberLike;
  name: string;
  amount: number;
}

const columns: ColumnDef<TopDonateRow>[] = [
  {
    accessorKey: "i",
    header: "#",
    meta: { className: "w-12 text-center" },
  },
  {
    accessorKey: "name",
    header: "Name",
    meta: { className: "w-full truncate" },
  },
  {
    accessorFn: (row) => `${row.amount}฿`,
    header: "Amount",
    meta: { className: "w-24" },
  },
];

export function TopDonateTable({ data }: { data: TopDonateRow[] }) {
  return (
    <DataTable
      home="/donate"
      columns={columns}
      data={data}
      emptyDescription="No donations yet."
      className="h-full max-h-[calc(100svh-264px)] w-full overflow-y-auto backdrop-blur-md"
    />
  );
}
