"use client";

import { DataTable } from "@/components/tantable";
import { SimpleTooltip } from "@/components/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { donations } from "@/lib/db/schema";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BitcoinIcon,
  BugPlay,
  ChevronsLeftRightEllipsis,
  Copy,
  Goal,
  ImageIcon,
  MessageCircleWarning,
} from "lucide-react";
import { useEllipsisVisible } from "react-hook-text-overflow";
import { ActionButton } from "../../../../components/action-button";
import { getImage, reloadWidget, resendPopup, testPopup } from "./api";
import { useEffect } from "react";
import posthog from "posthog-js";
import { sse } from "@/lib/db/sse-endpoints";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const columns: ColumnDef<typeof donations.$inferSelect>[] = [
  { accessorKey: "name", header: "Name", meta: { className: "w-50 truncate" } },
  {
    accessorFn: (row) => `${row.amount}฿`,
    header: "Amount",
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
    header: "Message",
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
      return (
        <div className="flex gap-1">
          <SimpleTooltip text="Re-send Popup">
            <ActionButton
              variant="outline"
              size="icon-sm"
              action={() => {
                posthog.capture("donation_admin_resend", {
                  id: row.row.original.id,
                });
                return resendPopup(row.row.original.id);
              }}
            >
              <MessageCircleWarning />
            </ActionButton>
          </SimpleTooltip>
          {row.row.original.uid ? (
            <SimpleTooltip text="Copy Artifact UID">
              <ActionButton
                size="icon-sm"
                action={() =>
                  navigator.clipboard.writeText(row.row.original.uid!)
                }
              >
                <Copy />
              </ActionButton>
            </SimpleTooltip>
          ) : (
            <div className="size-8" />
          )}
          {row.row.original.image && (
            <SimpleTooltip text="Open Image">
              <ActionButton
                size="icon-sm"
                variant="outline"
                action={async () => {
                  await getImage(row.row.original.id).then((blob) => {
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
    },
    meta: { className: "w-27 p-0" },
  },
];

export function DonateAdminPage({
  data,
}: {
  data: (typeof donations.$inferSelect)[];
}) {
  const router = useRouter();
  useEffect(() => {
    if (!router) return;
    return sse.donate.subMany({
      ping: () => router.refresh(),
      update: () => router.refresh(),
    }).clean;
  }, [router]);

  return (
    <div className="mx-auto flex w-full max-w-[max(1280px,90%)] flex-col">
      <span className="flex items-center gap-1 pt-1 pb-2 text-3xl font-semibold">
        <BitcoinIcon size={32} />
        Donate List
      </span>
      <DataTable
        columns={columns}
        emptyDescription="No donation came in yet."
        data={data}
        className="max-h-[calc(100vh-93px)] w-full overflow-y-auto bg-black/25 backdrop-blur-sm"
      ></DataTable>
    </div>
  );
}
