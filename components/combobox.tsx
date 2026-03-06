"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
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
  ...props
}: React.ComponentProps<"button"> & {
  data: { value: string; label: string }[];
  placeholder?: string;
  trigger?: React.ReactNode;
  onValueSelect?: (val: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

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
          <Command>
            <CommandInput placeholder={placeholder} className="h-9" />
            <CommandList>
              <CommandEmpty>None found.</CommandEmpty>
              <CommandGroup>
                {data.map((ent) => (
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
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <input id={id} name={name} type="hidden" value={value} />
    </>
  );
}
