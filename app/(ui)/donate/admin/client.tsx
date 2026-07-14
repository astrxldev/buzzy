"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  BitcoinIcon,
  BugPlay,
  ChevronsLeftRightEllipsis,
  CoinsIcon,
  Copy,
  Goal,
  ImageIcon,
  MessageCircleWarning,
  WalletIcon,
  QrCodeIcon as PromptpayIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { useEllipsisVisible } from "react-hook-text-overflow";
import { DataTable } from "@/components/tantable";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { donations } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { ActionButton } from "../../../../components/action-button";
import { getImage, reloadWidget, resendPopup, testPopup } from "./api";
import { formatDistanceToNow } from "date-fns";
import { lePalette } from "../../rubgram/admin/[id]/client";
import { th } from "date-fns/locale";
import TruemoneyIcon from "#/assets/tmn.webp";
import Image from "@/components/image";

// directly adapted for date instead of UUID
function colorFor(date: Date) {
  const seed =
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate();

  return lePalette[seed % lePalette.length];
}

const columns: ColumnDef<typeof donations.$inferSelect>[] = [
  {
    accessorKey: "created",
    header: "",
    cell(row) {
      return (
        <div
          className="absolute inset-0"
          style={{
            background: colorFor(row.row.original.created).bg,
          }}
        ></div>
      );
    },
    meta: { className: "w-1 p-0 relative" },
  },
  { accessorKey: "name", header: "ชื่อ", meta: { className: "w-50 truncate" } },
  {
    accessorFn: (row) => `${row.amount}฿`,
    header: "จำนวน",
    meta: { className: "w-24" },
  },
  {
    accessorKey: "message",
    cell(props) {
      const [overflow, ref] = useEllipsisVisible();
      return overflow ? (
        <HoverCard openDelay={150} closeDelay={0}>
          <HoverCardTrigger>
            <div ref={ref} className="truncate">
              {props.row.original.message}
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="flex w-5xl flex-col gap-0.5">
            <div className="font-semibold">{props.row.original.name}</div>
            <div>{props.row.original.message}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {`${props.row.original.amount}฿${props.row.original.uid ? ` - UID ${props.row.original.uid}` : ""}`}
            </div>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <div ref={ref} className="truncate">
          {props.row.original.message}
        </div>
      );
    },
    header: "ข้อความ",
    meta: { className: "w-full" },
  },
  {
    accessorKey: "id",
    header() {
      return (
        <div className="flex gap-1">
          <SimpleTooltip text="Send test popup">
            <ActionButton
              variant="outline"
              size="icon-sm"
              action={() => {
                posthog.capture("donation_admin_test_popup");
                return testPopup();
              }}
            >
              <BugPlay />
            </ActionButton>
          </SimpleTooltip>
          <SimpleTooltip text="Reload all widget">
            <ActionButton
              variant="outline"
              size="icon-sm"
              action={() => {
                posthog.capture("donation_admin_widget_reload");
                return reloadWidget();
              }}
            >
              <ChevronsLeftRightEllipsis />
            </ActionButton>
          </SimpleTooltip>
          <SimpleTooltip text="Set Goal">
            <Button asChild variant="outline" size="icon-sm">
              <Link href="/donate/admin/goal">
                <Goal />
              </Link>
            </Button>
          </SimpleTooltip>
        </div>
      );
    },
    cell(row) {
      return <ActionRow row={row.row.original} filler />;
    },
    meta: { className: "w-36 p-0" },
  },
];

function ActionRow({
  row,
  filler,
}: {
  row: typeof donations.$inferSelect;
  filler?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {row.method === "pp" ? (
        <PromptpayIcon className="size-8 p-1 opacity-50" />
      ) : (
        <Image
          src={TruemoneyIcon}
          alt="truemoney"
          className="size-8 p-1 opacity-50 brightness-200 grayscale"
        />
      )}
      <SimpleTooltip text="แสดง Popup อีกครั้ง">
        <ActionButton
          variant="outline"
          size="icon-sm"
          action={() => {
            posthog.capture("donation_admin_resend", {
              id: row.id,
            });
            return resendPopup(row.id);
          }}
        >
          <MessageCircleWarning />
        </ActionButton>
      </SimpleTooltip>
      {row.uid ? (
        <SimpleTooltip text="ก็อบ UID">
          <ActionButton
            size="icon-sm"
            action={() => navigator.clipboard.writeText(row.uid!)}
          >
            <Copy />
          </ActionButton>
        </SimpleTooltip>
      ) : filler ? (
        <div className="size-8" />
      ) : undefined}
      {row.image && (
        <SimpleTooltip text="เปิดภาพ">
          <ActionButton
            size="icon-sm"
            variant="outline"
            action={async () => {
              await getImage(row.id).then((blob) => {
                const url = URL.createObjectURL(blob);

                const tab = window.open("about:blank", "_blank");
                if (tab) {
                  tab.location.href = url;
                }
              });
            }}
          >
            <ImageIcon />
          </ActionButton>
        </SimpleTooltip>
      )}
    </div>
  );
}

function TopRow({
  row,
  stats,
  ...props
}: {
  row?: typeof donations.$inferSelect;
  stats: {
    total: number;
    today: number;
  };
} & ComponentProps<"div">) {
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!row) return setTime("");
    function update() {
      setTime(`${formatDistanceToNow(row!.created, { locale: th })}ที่แล้ว`);
    }
    const interval = setInterval(update, 1000);
    update();
    return () => clearInterval(interval);
  }, [row]);
  return (
    <div className="flex w-full gap-2 p-1" {...props}>
      {row ? (
        <div className="flex flex-10 flex-col rounded-lg border bg-card/50 py-1 pr-1 pl-2">
          <div className="flex justify-between text-xl">
            <div className="flex gap-2">
              <span className="font-semibold">{row.name}</span>
              <span className="opacity-70">{row.amount}฿</span>
            </div>
            <span className="pr-1 opacity-70">{time}</span>
          </div>
          <div className="min-h-20">{row.message}</div>
          <div className="flex justify-end">
            <ActionRow row={row} />
          </div>
        </div>
      ) : (
        <div className="flex-10 items-center justify-center rounded-lg border bg-card/50 px-2 py-1">
          <span>No donation yet</span>
        </div>
      )}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-lg border bg-card/50 px-2 py-1">
        <CoinsIcon className="absolute top-1/3 left-1/3 size-6/8 opacity-20" />
        <span>รวมวันนี้</span>
        <span className="text-3xl font-bold">{stats.today}฿</span>
      </div>
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-lg border bg-card/50 px-2 py-1 ">
        <WalletIcon className="absolute top-1/3 left-1/3 size-6/8 opacity-20" />
        <span>รวมทั้งหมด</span>
        <span className="text-3xl font-bold">{stats.total}฿</span>
      </div>
    </div>
  );
}

export function DonateAdminPage({
  data,
  stats,
}: {
  data: (typeof donations.$inferSelect)[];
  stats: {
    total: number;
    today: number;
  };
}) {
  const [maxHeight, setMaxHeight] = useState("");
  const topRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMaxHeight(`calc(100vh - 93px - ${topRowRef.current?.clientHeight}px)`);
  }, [data]);

  return (
    <div className="mx-auto flex w-full max-w-[max(1280px,90%)] flex-col">
      <span className="flex items-center gap-1 pt-1 pb-2 text-3xl font-semibold">
        <BitcoinIcon size={32} />
        โดเนททั้งหมด
      </span>
      <TopRow row={data[0]} ref={topRowRef} stats={stats} />
      <DataTable
        columns={columns}
        emptyDescription="No donation came in yet."
        data={data.slice(1)}
        className="w-full overflow-y-auto bg-black/25 backdrop-blur-sm"
        style={{
          maxHeight,
        }}
      ></DataTable>
      <DonateWatcher />
    </div>
  );
}

// component cuz simplicity sake
export function DonateWatcher() {
  const router = useRouter();
  useEffect(() => {
    if (!router) return;
    return sse.donate.subMany({
      ping: router.refresh.bind(router),
      update: router.refresh.bind(router),
    }).clean;
  }, [router]);

  return undefined;
}
