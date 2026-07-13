/** biome-ignore-all lint/a11y/noStaticElementInteractions: yes maam */
"use client";

import { FileSearch2, RefreshCw, X } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { b2sClient } from "@/app/(ui)/admin/cdn/table";
import { VirtualizedComboBox } from "@/components/combobox";
import { useFormContext } from "@/components/form";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import type { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function CurrencyInput(props: ComponentProps<typeof Input>) {
  return (
    <InputGroup>
      <InputGroupInput {...props} />
      <InputGroupAddon align="inline-end">฿</InputGroupAddon>
    </InputGroup>
  );
}

export function PriceInput() {
  const { values, setValue } = useFormContext();
  return (
    <div className="flex grow flex-col gap-2">
      <Label htmlFor="rg-price">Price</Label>
      <InputGroup>
        <InputGroupInput
          id="rg-price"
          type="number"
          placeholder="0"
          min={0}
          value={(values.price as string) ?? ""}
          onChange={(e) => setValue("price", e.target.value)}
        />
        <InputGroupAddon align="inline-end">บาท</InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function ServiceSelect({
  types,
  onValueChange,
  value = "",
}: {
  types: { id: string; display: string; price: number }[];
  onValueChange?: (v: string) => void;
  value?: string;
}) {
  return (
    <MultiSelect
      values={value?.split?.(",").filter(Boolean)}
      onValuesChange={(v) => onValueChange?.(v.filter(Boolean).join(","))}
    >
      <MultiSelectTrigger className="w-full">
        <MultiSelectValue placeholder="เลือกบริการ" />
      </MultiSelectTrigger>
      <MultiSelectContent search={false}>
        <MultiSelectGroup>
          {types.map((t) => (
            <MultiSelectItem value={t.id} key={t.id}>
              {t.display}{" "}
              <Kbd>
                {t.price} <span className="opacity-50">บาท</span>
              </Kbd>
            </MultiSelectItem>
          ))}
        </MultiSelectGroup>
      </MultiSelectContent>
    </MultiSelect>
  );
}

export function SlipUpload({
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
          "w-full justify-between",
          isSelected && "text-emerald-300!",
        )}
        variant="outline"
        type="button"
      >
        {isSelected ? (
          <span
            onClick={isSelected ? choose : undefined}
            className="min-w-0 truncate"
          >
            {value.name} <Kbd>{b2sClient(Number(value.size))}</Kbd>
          </span>
        ) : (
          "อัพโหลดสลิปโอนเงิน"
        )}
        {isSelected ? (
          <SimpleTooltip text="Unselect">
            <X
              className="pointer-events-auto! hover:text-red-500"
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

export function UserSelect({
  value,
  onValueChange,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<
    { username: string; uid: string; display: string }[]
  >([]);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/discord/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [bump]);

  return (
    <div className="flex w-full gap-1">
      <VirtualizedComboBox
        onValueSelect={onValueChange}
        defaultValue={value}
        placeholder="Select User"
        id="character"
        name="character"
        data={users.map((e) => ({
          label: (
            <>
              {e.display} <Kbd>{e.username}</Kbd>
            </>
          ),
          context: [e.display, e.username],
          value: e.uid,
        }))}
        className="grow bg-transparent! hover:bg-accent!"
      />
      <Button
        size="icon"
        variant="outline"
        onClick={() => setBump(Date.now())}
        disabled={loading}
        type="button"
      >
        {loading ? <Spinner /> : <RefreshCw />}
      </Button>
    </div>
  );
}
