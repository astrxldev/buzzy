"use client";

import { SimpleTooltip } from "@/components/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { X, FileSearch2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { b2sClient } from "../admin/cdn/table";
import { Button } from "@/components/ui/button";

export function DonateImageUpload({
  value: externalValue,
  onValueChange,
}: {
  value?: File | null | undefined;
  onValueChange?: (value: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<File | undefined | null>(externalValue);
  const isSelected = !!value?.name;

  useEffect(() => {
    if (
      typeof externalValue === "object" &&
      externalValue &&
      Object.keys(externalValue).length === 0
    )
      // ignore {}
      return;
    setValue(externalValue);
  }, [externalValue]);

  function choose() {
    ref.current?.click();
  }
  return (
    <>
      <Button
        onClick={isSelected ? undefined : () => ref.current?.click()}
        className={cn(
          "h-full w-full aspect-square justify-between",
          isSelected && "text-emerald-300!",
        )}
        variant="outline"
        type="button"
      >
        {isSelected ? (
          <span onClick={isSelected ? choose : undefined} className="truncate">
            {value.name} <Kbd>{b2sClient(Number(value.size))}</Kbd>
          </span>
        ) : (
          "a"
        )}
        {isSelected ? (
          <SimpleTooltip text="Unselect">
            <X
              className="hover:text-red-500 pointer-events-auto!"
              onClick={() => {
                setValue(null);
                onValueChange?.(null);
              }}
            />
          </SimpleTooltip>
        ) : (
          <FileSearch2 />
        )}
      </Button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={() => {
          const file = ref.current?.files?.[0] || null;
          setValue(file);
          onValueChange?.(file);
        }}
      />
    </>
  );
}
