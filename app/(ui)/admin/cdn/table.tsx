"use client";

import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  CloudUpload,
  Copy,
  ExternalLink,
  HardDriveDownload,
  Pencil,
  ReplaceAll,
  Trash,
  Trash2,
} from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/tantable";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cdnDelete, cdnify } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fetchToCdn, rename } from "./api";

const columns: ColumnDef<{
  id: string;
  name: string | null;
  size: string;
}>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorFn: (row) => b2sClient(Number(row.size)),
    header: "Size",
  },
];

export function CdnTable({
  files,
  onChoose,
}: {
  files: {
    id: string;
    name: string | null;
    size: string;
  }[];
  onChoose?: (
    value: {
      id: string;
      name: string | null;
      size: string;
    } | null,
  ) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [urls, setUrls] = useState("");
  const selectedIds = useMemo(
    () =>
      Object.entries(rowSelection)
        .filter((r) => r[1])
        .map((r) => files[Number(r[0])].id),
    [rowSelection, files],
  );

  async function upload(ev: ChangeEvent<HTMLInputElement>) {
    const { files } = ev.target;
    if (!files) return;
    for (const file of files) {
      toast.promise(cdnify(file), {
        loading: `Uploading ${file.name}...`,
        success: () => {
          return `${file.name} has been uploaded to CDN.`;
        },
        error: `Error uploading ${file.name}.`,
      });
    }
  }

  async function deleteSelected() {
    toast.promise(cdnDelete(selectedIds), {
      loading: `Delete ${selectedIds.length} files...`,
      success: (res) => {
        if (res) {
          const file = files.find((f) => f.id === res.id);
          toast.error(
            `Error deleting ${file ? file.name || `[${res.id}]` : `[${res.id}]`}`,
            {
              description: `because it is still being used by ${res.refs.join(", ")}`,
            },
          );
          throw "";
        }
        setRowSelection({});
        return `${selectedIds.length} files has been deleted.`;
      },
      error: `Error deleting the files.`,
    });
  }

  async function fetchUrls() {
    const urlList: string[] = urls
      .toString()
      .split("\n")
      .filter((u) => u);
    if (!urlList.length) return;
    toast.promise(fetchToCdn(urlList), {
      loading: `Fetching ${urlList.length} files...`,
      success: () => {
        return `${urlList.length} URLs has been uploaded to CDN.`;
      },
      error: "Error fetching the files.",
    });
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div
        className={cn(
          onChoose ? "h-[calc(70svh-60px)] w-full" : "h-[calc(100svh-60px)]",
          "overflow-auto rounded-md bg-[#2225] backdrop-blur-sm border",
        )}
      >
        <DataTable
          columns={columns}
          data={files}
          className={"border-none"}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          context={(row) => [
            {
              label: "เปิดในแท็บใหม่",
              icon: <ExternalLink />,
              onClick() {
                open(`/cdn/${row.id}`);
              },
            },
            {
              label: "ก็อปลิ้งค์",
              icon: <Copy />,
              onClick() {
                toast.promise(
                  navigator.clipboard.writeText(
                    new URL(`/cdn/${row.id}`, location.href).href,
                  ),
                  {
                    success() {
                      return "ก็อปลิ้งค์สำเร็จ";
                    },
                    error() {
                      return "เกิดข้อผิดพลาดขณะก็อปลิ้งค์";
                    },
                  },
                );
              },
            },
            {
              label: "เปลี่ยนชื่อ",
              icon: <Pencil />,
              onClick() {
                const newName = prompt("ชื่อไฟล์ใหม่", row.name ?? undefined);
                if (!newName) return;

                toast.promise(rename(row.id, newName), {
                  success() {
                    return "เปลี่ยนชื่อสำเร็จ";
                  },
                  error() {
                    return "เกิดข้อผิดพลาดขณะเปลี่ยนชื่อ";
                  },
                });
              },
            },
            {
              label: "ลบไฟล์",
              icon: <Trash />,
              onClick() {
                toast.promise(cdnDelete([row.id]), {
                  success(res) {
                    if (res) {
                      const file = files.find((f) => f.id === res.id);
                      throw `${file ? file.name || `[${res.id}]` : `[${res.id}]`} ยังถูกใช้โดย ${res.refs.join(", ")}`;
                    }
                    return "ลบสำเร็จ";
                  },
                  error(err: { message: string; description: string }) {
                    if (typeof err === "string") return err;
                    return "เกิดข้อผิดพลาดขณะลบ";
                  },
                });
              },
            },
          ]}
          onClick={(row) => onChoose?.(row)}
        />
      </div>

      <div className="flex justify-between h-9">
        <div className="flex gap-2">
          <SimpleTooltip text="Upload...">
            <Button size="icon" onClick={() => fileInputRef.current?.click()}>
              <CloudUpload />
            </Button>
          </SimpleTooltip>
          <Dialog>
            <SimpleTooltip text="Fetch from URL...">
              <DialogTrigger asChild>
                <Button size="icon" variant="outline">
                  <HardDriveDownload />
                </Button>
              </DialogTrigger>
            </SimpleTooltip>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fetch From URLs</DialogTitle>
                <DialogDescription>
                  Enter URLs to be fetched and added to CDN below. One URL per
                  line.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="https://cdn.dgnr.us/paimon.png..."
                onChange={(ev) => setUrls(ev.target.value)}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button onClick={fetchUrls}>Fetch</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2">
          <SimpleTooltip text="Replace File (WIP)">
            <Button size="icon" variant="outline" disabled>
              <ReplaceAll />
            </Button>
          </SimpleTooltip>
          <SimpleTooltip text="Delete File">
            <Button
              size="icon"
              variant="destructive"
              disabled={selectedIds.length <= 0}
              onClick={deleteSelected}
            >
              <Trash2 />
            </Button>
          </SimpleTooltip>
        </div>
      </div>
      <div className="hidden">
        <input type="file" multiple ref={fileInputRef} onChange={upload} />
      </div>
    </div>
  );
}

export const b2sClient = (t: number) => {
  let e = (Math.log2(t) / 10) | 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: copied
  return `${(t / 1024 ** (e = e <= 0 ? 0 : e)).toFixed(1)}${" KMGP"[e]}B`;
};
