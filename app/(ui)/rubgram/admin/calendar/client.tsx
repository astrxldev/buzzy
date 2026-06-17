"use client";

import { format, getDaysInMonth, startOfMonth } from "date-fns";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  ImageOff,
  ReceiptText,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { SimpleTooltip } from "@/components/tooltip";
import { toggleMonth } from "../../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
type Row = {
  id: string;
  name: string;
  queue: number;
  checked: boolean;
  server: "as" | "eu" | "us" | "tw";
  expires: Date | null;
  price: number;
  service: string[];
  slip: {
    id: string;
    ref: string;
    amount: string;
    data: unknown;
  } | null;
  paid: boolean;
  deleted: boolean;
  submit_day: Date;
  user: {
    uid: string;
    display: string;
    username: string;
    token: string;
  } | null;
};

const DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

export function CalendarClient({
  year,
  month,
  rows,
  total,
  monthly,
}: {
  year: number;
  month: number;
  rows: Row[];
  total: number;
  monthly: Record<string, boolean>;
}) {
  const current = new Date(year, month);

  const rowsByDay = useMemo(() => {
    const map: Record<number, Row[]> = {};
    for (const r of rows) {
      if (!r.submit_day) continue;
      const d = new Date(r.submit_day).getDate();
      (map[d] ??= []).push(r);
    }
    return map;
  }, [rows]);

  const ym = `${year}-${String(month + 1).padStart(2, "0")}`;
  const [pending, startTransition] = useTransition();
  const monthChecked = monthly[ym] ?? false;

  const daysInMonth = getDaysInMonth(current);
  const firstDayOfWeek = startOfMonth(current).getDay(); // 0=Sun
  const monthLabel = format(current, "MMMM yyyy");
  const prevY = month === 0 ? year - 1 : year;
  const prevM = month === 0 ? 11 : month - 1;
  const nextY = month === 11 ? year + 1 : year;
  const nextM = month === 11 ? 0 : month + 1;
  const prevHref = `/rubgram/admin/calendar?month=${prevY}-${String(prevM + 1).padStart(2, "0")}`;
  const nextHref = `/rubgram/admin/calendar?month=${nextY}-${String(nextM + 1).padStart(2, "0")}`;

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={prevHref}>
              <ChevronLeft />
            </Link>
          </Button>
          <span className="inline-block min-w-35 shrink-0 text-center text-lg font-semibold">
            {monthLabel}
          </span>
          <Button variant="outline" size="icon" asChild>
            <Link href={nextHref}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <SimpleTooltip
            text={monthChecked ? "ทำเรื่องเงินแล้ว" : "ยังไม่ได้ทำเรื่องเงิน"}
          >
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  toggleMonth(ym).catch((e) => toast.error(e as string));
                })
              }
              className="cursor-pointer"
            >
              {monthChecked ? (
                <Check className="size-5 text-green-500" />
              ) : (
                <Circle className="size-5 text-muted-foreground" />
              )}
            </button>
          </SimpleTooltip>
          <div className="text-muted-foreground">
            รวม{" "}
            <span className="font-semibold text-foreground">
              {total.toLocaleString()}
            </span>{" "}
            บาท
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-[min-content_repeat(6,minmax(0,1fr))] gap-px rounded-lg bg-black/25">
        {DAYS.map((d) => (
          <div
            key={d}
            className="p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {/* some hack for month start */}
        {Array.from({
          length: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1,
        }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayRows = rowsByDay[day] || [];
          const dayTotal = dayRows.reduce((s, r) => s + r.price, 0);
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
                        {dayRows.length} คิว
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {dayTotal.toLocaleString()} ฿
                      </span>
                    </>
                  )}
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[80svh] max-w-lg overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {format(
                      new Date(current.getFullYear(), current.getMonth(), day),
                      "d MMM yyyy",
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                  {dayRows.length === 0 && (
                    <p className="text-sm text-muted-foreground">ไม่มีคิวในวันนี้</p>
                  )}
                  {dayRows.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-start gap-3 rounded-md border p-3",
                        r.deleted && "opacity-50",
                      )}
                    >
                      {r.slip ? (
                        <div className="relative size-16 shrink-0 overflow-hidden rounded">
                          <Image
                            src={`/api/slip/${r.slip.id}`}
                            alt="Slip"
                            fill
                            className="object-cover blur-sm brightness-50"
                          />
                        </div>
                      ) : r.price <= 0 ? (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted">
                          <ReceiptText className="size-6 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted">
                          <ImageOff className="size-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">
                            {r.queue}. {r.name}
                          </span>
                          {r.deleted && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Trash2 className="size-3.5 shrink-0 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>ลบแล้ว</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <span className="truncate text-xs text-muted-foreground">
                          {r.service.join(", ")}
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{r.price} ฿</span>
                          {r.user && (
                            <span className="text-muted-foreground">
                              {r.user.display}
                            </span>
                          )}
                          {r.slip && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-auto size-5"
                                >
                                  <ExternalLink className="size-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="flex h-full max-w-dvw! flex-col bg-[#2225] backdrop-blur-xs">
                                <DialogTitle className="h-min">สลิป</DialogTitle>
                                <DialogClose asChild>
                                  <div className="relative flex h-full w-full grow justify-center">
                                    <Image
                                      src={`/api/slip/${r.slip.id}`}
                                      alt="Slip"
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                </DialogClose>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
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
        })}
      </div>
    </div>
  );
}
