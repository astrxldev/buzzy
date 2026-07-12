"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { FolderCode, Plus } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { type MouseEventHandler, type ReactNode, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  openCreateDialog,
  emptyDescription,
  rowSelection,
  setRowSelection,
  home,
  context,
  onClick,
  style,
}: DataTableProps<TData, TValue> & {
  className?: string;
  openCreateDialog?: () => void;
  emptyDescription?: string;
  rowSelection?: RowSelectionState;
  setRowSelection?: (
    state: RowSelectionState | ((old: RowSelectionState) => RowSelectionState),
  ) => void;
  home?: string;
  context?: (row: TData) => {
    label: string;
    onClick?: MouseEventHandler<HTMLDivElement>;
    icon?: ReactNode;
  }[];
  onClick?: (row: TData) => void;
} & Pick<ComponentProps<"div">, "style">) {
  const [internalRowSelection, setInternalRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection || setInternalRowSelection,
    state: {
      rowSelection: rowSelection || internalRowSelection,
    },
  });

  return (
    <div
      className={cn("overflow-hidden rounded-md border", className)}
      style={style}
    >
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={
                      (
                        header.column.columnDef.meta as
                          | { className?: string }
                          | undefined
                      )?.className
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <ContextMenu key={row.id}>
                <ContextMenuTrigger asChild>
                  <TableRow
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onClick?.(row.original)}
                    className="group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          (
                            cell.column.columnDef.meta as
                              | { className?: string }
                              | undefined
                          )?.className
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {context?.(row.original).map((option) => (
                    <ContextMenuItem
                      key={option.label}
                      onClick={option.onClick}
                    >
                      {option.icon}
                      {option.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuContent>
              </ContextMenu>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FolderCode />
                    </EmptyMedia>
                    <EmptyTitle>Nothing Yet</EmptyTitle>
                    <EmptyDescription>
                      {emptyDescription ||
                        "You haven't created any entries yet. Get started by creating your first entry."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <div className="flex gap-2">
                      {openCreateDialog && (
                        <Button onClick={openCreateDialog}>
                          <Plus />
                          Create
                        </Button>
                      )}
                      <Link href={home ?? "/admin"}>
                        <Button variant="outline">Home</Button>
                      </Link>
                    </div>
                  </EmptyContent>
                </Empty>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
