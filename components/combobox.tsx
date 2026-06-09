"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function ComboBox({
  data,
  placeholder = "Search...",
  id,
  name,
  className,
  trigger,
  onValueSelect,
  defaultValue = "",
  ...props
}: React.ComponentProps<"button"> & {
  data: { value: string; label: React.ReactNode; context?: string[] }[];
  placeholder?: string;
  trigger?: React.ReactNode;
  onValueSelect?: (val: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  const [query, setQuery] = React.useState("");

  const list = React.useMemo(
    () =>
      data.map((ent) => ({
        context: (
          ent.context?.join("") ??
          "" + (typeof ent.label === "string" ? ent.label : "") + ent.value
        ).toLowerCase(),
        comp: (
          <CommandItem
            key={ent.value}
            value={ent.value}
            onSelect={(currentValue) => {
              if (onValueSelect) onValueSelect(currentValue);
              else setValue(currentValue === value ? "" : currentValue);
              setOpen(false);
            }}
          >
            {ent.label}
            <Check
              className={cn(
                "ml-auto",
                value === ent.value ? "opacity-100" : "opacity-0",
              )}
            />
          </CommandItem>
        ),
      })),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );
  const queryLower = query.toLowerCase();

  React.useEffect(() => {
    if (defaultValue) setValue(defaultValue);
  }, [defaultValue]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger || (
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-50 justify-between", className)}
              {...props}
            >
              {value
                ? data.find((ent) => ent.value === value)?.label
                : placeholder}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-100 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              onValueChange={setQuery}
              placeholder={placeholder}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>None found.</CommandEmpty>
              <CommandGroup>
                {list
                  .filter((e) => e.context.includes(queryLower))
                  .map((e) => e.comp)}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <input id={id} name={name} type="hidden" value={value} />
    </>
  );
}

export function VirtualizedComboBox({
  data,
  placeholder = "Search...",
  id,
  name,
  className,
  trigger,
  onValueSelect,
  defaultValue = "",
  itemHeight = 36,
  ...props
}: React.ComponentProps<"button"> & {
  data: { value: string; label: React.ReactNode; context?: string[] }[];
  placeholder?: string;
  trigger?: React.ReactNode;
  onValueSelect?: (val: string) => void;
  itemHeight?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return data;
    return data.filter((ent) => {
      const ctx = (
        ent.context?.join("") ??
        "" + (typeof ent.label === "string" ? ent.label : "") + ent.value
      ).toLowerCase();
      return ctx.includes(q);
    });
  }, [data, query]);

  const listRef = React.useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = React.useState<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    setTimeout(() => {
      setScrollEl(listRef.current);
    }, 100);
  }, [open, listRef]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  React.useEffect(() => {
    if (defaultValue) setValue(defaultValue);
  }, [defaultValue]);

  const visibleItems = scrollEl ? virtualizer.getVirtualItems() : [];

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger || (
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-50 justify-between", className)}
              {...props}
            >
              <div>
                {value
                  ? data.find((ent) => ent.value === value)?.label
                  : placeholder}
              </div>
              <ChevronsUpDown className="opacity-50" />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-100 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              onValueChange={setQuery}
              placeholder={placeholder}
              className="h-9"
            />
            <CommandList>
              <div
                ref={listRef}
                style={{ maxHeight: 300, overflowY: "auto" }}
                onWheel={(e) => e.stopPropagation()}
              >
                {filtered.length === 0 ? (
                  <div className="py-6 text-center text-sm">None found.</div>
                ) : (
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      position: "relative",
                    }}
                  >
                    {visibleItems.map((virtualItem) => {
                      const item = filtered[virtualItem.index];
                      return (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <CommandItem
                            value={item.value}
                            onSelect={(currentValue) => {
                              if (onValueSelect) onValueSelect(currentValue);
                              else
                                setValue(
                                  currentValue === value ? "" : currentValue,
                                );
                              setOpen(false);
                            }}
                          >
                            {item.label}
                            <Check
                              className={cn(
                                "ml-auto",
                                value === item.value
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <input id={id} name={name} type="hidden" value={value} />
    </>
  );
}
