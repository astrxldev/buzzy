/** biome-ignore-all lint/a11y/noStaticElementInteractions: yes maam */
"use client";

import { FileSearch2, Search, X } from "lucide-react";
import {
  type ComponentProps,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { b2sClient, CdnTable } from "@/app/(ui)/admin/cdn/table";
import type { cdn } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { SimpleTooltip } from "../tooltip";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
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
  const [options, setOptions] = useState<{ type?: string }>();
  const callback = useRef<((value: CdnFile | null) => void) | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search
    ? files?.filter(
        (f) => f.name?.toLowerCase().includes(search) || f.id === search,
      )
    : files;

  const updateList = useCallback(
    async (opt = options) => {
      const list = await listFiles().catch(() => []);
      setFiles(
        opt?.type
          ? list.toReversed().filter((file) => file.type.startsWith(opt.type!))
          : list.toReversed(),
      );
    },
    [options],
  );

  const call = useCallback(
    async (options?: { type?: string }): Promise<CdnFile | null> => {
      setSearch("");
      setOpen(true);
      await updateList(options);
      setOptions(options);
      return new Promise<CdnFile | null>((resolve) => {
        callback.current = resolve;
      }).finally(() => setOpen(false));
    },
    [updateList],
  );

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
        <DialogContent className="flex max-h-[85vh] flex-col gap-4 md:max-w-[50svw]">
          <DialogTitle className="flex items-center justify-between px-6">
            Choose File{" "}
            <InputGroup className="max-w-xs">
              <InputGroupInput
                placeholder="Search..."
                onChange={(ev) => setSearch(ev.target.value.toLowerCase())}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                {filtered?.length || 0} results
              </InputGroupAddon>
            </InputGroup>
          </DialogTitle>
          {files ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <CdnTable
                files={filtered || []}
                onChoose={(value) => callback.current?.(value)}
                onChange={updateList}
              />
            </div>
          ) : (
            <div className="flex h-[calc(70svh-60px)] w-full items-center justify-center">
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
    // oxlint-disable-next-line react-hooks/exhaustive-deps
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
        onClick={value ? undefined : choose}
        className={cn("min-w-50 justify-between", className)}
        // size="sm"
        variant="outline"
        type="button"
      >
        {children ||
          (meta ? (
            <span onClick={value ? choose : undefined} className="truncate">
              {meta.name} <Kbd>{b2sClient(Number(meta.size))}</Kbd>
            </span>
          ) : value ? (
            <span onClick={value ? choose : undefined}>File Selected</span>
          ) : (
            "Select File"
          ))}
        {value ? (
          <SimpleTooltip text="Unselect">
            <X
              className="pointer-events-auto! hover:text-red-500"
              onClick={() => {
                setValue("");
                setMeta(undefined);
              }}
            />
          </SimpleTooltip>
        ) : (
          <FileSearch2 />
        )}
      </Button>
      <input value={value} hidden {...props} readOnly />
    </>
  );
}
