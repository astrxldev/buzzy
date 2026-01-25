"use client";

import { format } from "date-fns";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({
  onValueChange,
  value,
  defaultValue,
}: {
  onValueChange?: (value: string | undefined) => void;
  value?: string | Date | undefined;
  defaultValue?: string | Date | undefined;
}) {
  const [date, setDateInternal] = React.useState<Date | undefined>(
    toDate(defaultValue),
  );

  React.useEffect(() => {
    setDateInternal(toDate(value));
  }, [value]);

  const setDate = React.useCallback(
    (
      value: Date | undefined | ((old: Date | undefined) => Date | undefined),
    ) => {
      if (typeof value === "function") return setDate(value);
      onValueChange?.(value?.toLocaleDateString("en-GB"));
      setDateInternal(value);
    },
    [onValueChange],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id="date-picker-simple"
          className="justify-start font-normal"
        >
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          required={false}
          selected={date}
          onSelect={setDate}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  );
}

function toDate(str: Date | string | undefined) {
  if (str instanceof Date) return str;
  if (!str) return undefined;
  const [d, m, y] = str.split("/").map(Number);
  return new Date(y, m - 1, d);
}
