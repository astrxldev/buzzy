"use client";

import { format, getDaysInMonth, startOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  QrCodeIcon as PromptpayIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import TruemoneyIcon from "#/assets/tmn.webp";
import Image from "@/components/image";
import { SimpleTooltip } from "@/components/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  amount: number;
  message: string | null;
  created: Date;
  uid: string | null;
  method: "tmn" | "pp";
  image: boolean;
};

const DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

export function CalendarClient({
  year,
  month,
  rows,
  total,
}: {
  year: number;
  month: number;
  rows: Row[];
  total: number;
}) {
  const current = new Date(year, month);

  const rowsByDay = useMemo(() => {
    const map: Record<number, Row[]> = {};
    for (const row of rows) {
      const day = new Date(row.created).getDate();
      (map[day] ??= []).push(row);
    }
    return map;
  }, [rows]);

  const daysInMonth = getDaysInMonth(current);
  const firstDayOfWeek = startOfMonth(current).getDay();
  const monthLabel = format(current, "MMMM yyyy", { locale: th });
  const prevY = month === 0 ? year - 1 : year;
  const prevM = month === 0 ? 11 : month - 1;
  const nextY = month === 11 ? year + 1 : year;
  const nextM = month === 11 ? 0 : month + 1;
  const prevHref = `/donate/admin/calendar?month=${prevY}-${String(prevM + 1).padStart(2, "0")}`;
  const nextHref = `/donate/admin/calendar?month=${nextY}-${String(nextM + 1).padStart(2, "0")}`;

  return (
    <div className="flex h-full min-h-[70svh] flex-col p-4 lg:min-h-[85svh]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={prevHref} prefetch replace>
              <ChevronLeft />
            </Link>
          </Button>
          <span className="inline-block min-w-35 shrink-0 text-center text-lg font-semibold capitalize">
            {monthLabel}
          </span>
          <Button variant="outline" size="icon" asChild>
            <Link href={nextHref} prefetch replace>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <div className="mr-8 text-muted-foreground">
          รวม{" "}
          <span className="font-semibold text-foreground">
            {total.toLocaleString()}
          </span>{" "}
          บาท
        </div>
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-[min-content_repeat(6,minmax(0,1fr))] gap-px rounded-lg bg-black/25">
        {DAYS.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {Array.from(
          { length: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 },
          (_, index) => `pad-${index + 1}`,
        ).map((key) => (
          <div key={key} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
          (day) => {
            const dayRows = rowsByDay[day] || [];
            const dayTotal = dayRows.reduce((sum, row) => sum + row.amount, 0);
            const hasData = dayRows.length > 0;

            return (
              <Dialog key={day}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-md border p-2 text-left transition-colors",
                      hasData
                        ? "cursor-pointer border-primary/30 bg-primary/5 hover:bg-primary/10"
                        : "border-transparent",
                      !hasData && "cursor-default",
                    )}
                  >
                    <span className="text-sm">{day}</span>
                    {hasData && (
                      <>
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 py-0 text-[10px]"
                        >
                          {dayRows.length} รายการ
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {dayTotal.toLocaleString()} ฿
                        </span>
                      </>
                    )}
                  </button>
                </DialogTrigger>
                <DialogContent className="max-h-[80svh] max-w-xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {format(
                        new Date(
                          current.getFullYear(),
                          current.getMonth(),
                          day,
                        ),
                        "d MMM yyyy",
                        { locale: th },
                      )}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-2">
                    {dayRows.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        ไม่มีโดเนทในวันนี้
                      </p>
                    )}
                    {dayRows.map((row) => (
                      <div
                        key={row.id}
                        className="flex gap-2 rounded-md border p-3"
                      >
                        <div
                          className={cn(
                            "flex size-10 items-center justify-center rounded-sm",
                            row.method === "pp"
                              ? "bg-[#0B5394]"
                              : "bg-[#FF8300]/50",
                          )}
                        >
                          {row.method === "pp" ? (
                            <SimpleTooltip text="PromptPay">
                              <PromptpayIcon className="size-8 p-1 opacity-50" />
                            </SimpleTooltip>
                          ) : (
                            <SimpleTooltip text="TrueMoney">
                              <Image
                                src={TruemoneyIcon}
                                alt="truemoney"
                                className="size-8 p-1 opacity-50 brightness-200 grayscale"
                              />
                            </SimpleTooltip>
                          )}
                        </div>
                        <div className="flex flex-1 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {row.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(row.created, "HH:mm", { locale: th })}
                              {row.uid ? ` - UID ${row.uid}` : ""}
                            </div>
                          </div>
                          <span className="shrink-0 font-medium">
                            {row.amount.toLocaleString()} ฿
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <span className="text-sm text-muted-foreground">
                      รวม {dayTotal.toLocaleString()} บาท
                    </span>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            );
          },
        )}
      </div>
    </div>
  );
}
