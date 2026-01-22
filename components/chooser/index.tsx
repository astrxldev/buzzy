"use client";

import { Check, FileSearch2 } from "lucide-react";
import {
  type ComponentProps,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { b2sClient, CdnTable } from "@/app/(ui)/admin/cdn/table";
import type { cdn } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Kbd } from "../ui/kbd";
import { Spinner } from "../ui/spinner";
import { listFiles } from "./api";
import { CdnChooserContext, type CdnFile } from "./context";

export function CdnChooserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<
    Omit<typeof cdn.$inferSelect, "data">[] | null
  >(null);
  const callback = useRef<((value: CdnFile | null) => void) | null>(null);

  async function call(options?: { type?: string }): Promise<CdnFile | null> {
    setOpen(true);
    const list = await listFiles().catch(() => []);
    setFiles(
      options?.type
        ? list.filter((file) => file.type.startsWith(options.type!))
        : list,
    );
    return new Promise<CdnFile | null>((resolve) => {
      callback.current = resolve;
    }).finally(() => setOpen(false));
  }

  return (
    <CdnChooserContext value={{ call }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) callback.current?.(null);
          setOpen(o);
        }}
      >
        <DialogContent className="max-h-[85vh] flex flex-col gap-4 md:max-w-[50svw]">
          <DialogTitle className="px-6 pt-6">Choose File</DialogTitle>
          {files ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <CdnTable
                files={files}
                onChoose={(value) => callback.current?.(value)}
              />
            </div>
          ) : (
            <div className="flex h-[calc(70svh-60px)] w-full justify-center items-center">
              <Spinner />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CdnChooserContext>
  );
}

export function CdnChooser({
  className,
  onChange,
  type,
  children,
  defaultValue,
  value: externalValue,
  ...props
}: ComponentProps<"input"> & {
  onChange?: (value: string) => void;
  type?: string;
  value?: string;
}) {
  const [value, setValue] = useState<string>(`${defaultValue || ""}`);
  const [meta, setMeta] = useState<CdnFile>();
  const chooser = useContext(CdnChooserContext);

  // biome-ignore lint/correctness/useExhaustiveDependencies: first run only
  useEffect(() => {
    setValue(externalValue || "");
    const newVal = externalValue || defaultValue || "";
    if (!newVal) {
      if (meta) setMeta(undefined);
      return;
    }
    (async () => {
      const fileList = await listFiles();
      const file = fileList.find((f) => f.id === newVal);
      if (!file) return setValue("");
      setMeta(file);
    })();
  }, [externalValue]);

  async function choose() {
    const res = await chooser?.call({ type });
    if (res) {
      setValue(res.id);
      onChange?.(res.id);
      setMeta(res);
    }
  }

  return (
    <>
      <Button
        onClick={choose}
        className={cn("min-w-50 justify-between", className)}
        // size="sm"
        variant="outline"
        type="button"
      >
        {children ||
          (meta ? (
            <span>
              {meta.name} <Kbd>{b2sClient(Number(meta.size))}</Kbd>
            </span>
          ) : value ? (
            "File Selected"
          ) : (
            "Select File"
          ))}
        {value ? <Check /> : <FileSearch2 />}
      </Button>
      <input value={value} hidden {...props} readOnly />
    </>
  );
}
