"use client";

import { useProgress } from "@bprogress/next";
import { BitcoinIcon, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { getArtifactConfig } from "@/lib/api";
import { setLimit, toggleCheck, toggleLock } from "@/lib/api";
import { shared } from "@/lib/comms";
import { sse } from "@/lib/db/sse-endpoints";
import { cn } from "@/lib/utils";
import { MaybeWrap } from "@/components/action-button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export function SidebarLink({
  submission,
  className,
}: {
  submission: {
    id: string;
    name: string;
    checked: boolean;
    queue: number | null;
    comment: string;
    uid: string;
  };
  className?: string;
}) {
  const { stop } = useProgress();
  const { id } = useParams();
  const [checked, setChecked] = useState(submission.checked);

  useEffect(() => {
    setChecked(submission.checked);
  }, [submission.checked]);

  return (
    <MaybeWrap
      wrap={submission.queue === null}
      wrapper={({ children }) => (
        <HoverCard openDelay={150} closeDelay={0}>
          <HoverCardTrigger
            onClick={() => {
              navigator.clipboard.writeText(submission.uid);
              toast("คัดลอก UID แล้ว");
            }}
          >
            {children}
          </HoverCardTrigger>
          <HoverCardContent
            className="flex w-2xl flex-col gap-0.5"
            side="right"
          >
            <div className="font-semibold">{submission.name}</div>
            <div className="line-clamp-3">{submission.comment}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              คิวลัด - UID {submission.uid} (คลิ๊กเพื่อคัดลอก)
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    >
      <Link
        href={
          submission.queue === null ? "" : `/artifact/admin/${submission.id}`
        }
        className={cn(
          className,
          id === submission.id && "bg-accent text-accent-foreground",
          submission.queue === null && "border border-yellow-400",
        )}
        prefetch
        onClick={(ev) => {
          if ((ev.target as HTMLButtonElement).type === "button") {
            ev.preventDefault();
          }
        }}
      >
        {submission.queue === null ? (
          <div className="flex items-center">
            <BitcoinIcon className="-ml-1 text-yellow-400" size={20} />{" "}
            {submission.name}
          </div>
        ) : (
          `${submission.queue}. ${submission.name}`
        )}
        <SidebarMenuBadge className="pointer-events-auto">
          <Checkbox
            className="mr-2"
            checked={checked}
            onCheckedChange={async () => {
              setChecked((x) => !x);
              await toggleCheck(submission.id);
              stop();
            }}
          />
        </SidebarMenuBadge>
      </Link>
    </MaybeWrap>
  );
}

export function LimitManager({
  config,
  length,
  ...props
}: React.ComponentProps<typeof SidebarMenu> & {
  config: Awaited<ReturnType<typeof getArtifactConfig>>;
  length: number;
}) {
  return (
    <SidebarMenu {...props}>
      <SidebarMenuItem>
        <Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton>
                <Tooltip>
                  {config.locked ? (
                    <>
                      <TooltipTrigger asChild>
                        <Lock className="text-red-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>ปิดรับ</p>
                      </TooltipContent>
                    </>
                  ) : config.limit >= 0 && length > config.limit ? (
                    <>
                      <TooltipTrigger asChild>
                        <Lock className="text-orange-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>เต็มแล้ว</p>
                      </TooltipContent>
                    </>
                  ) : (
                    <>
                      <TooltipTrigger asChild>
                        <Unlock className="text-sky-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>เปิดรับ</p>
                      </TooltipContent>
                    </>
                  )}
                </Tooltip>{" "}
                จำนวน
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <span>ตั้ง Limit</span>
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ตั้ง Limit</DialogTitle>
                </DialogHeader>
                <form
                  id="limit-form"
                  action={async (data: FormData) => {
                    await setLimit(Number(data.get("limit")) || -1);
                    toast.success("บันทึกการเปลี่ยนแปลงแล้ว");
                  }}
                >
                  <Input
                    id="limit"
                    name="limit"
                    type="number"
                    placeholder="ไม่จำกัด"
                    defaultValue={config.limit >= 0 ? config.limit : ""}
                  />
                </form>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">ยกเลิก</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button type="submit" form="limit-form">
                      บันทึกการเปลี่ยนแปลง
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
              <DropdownMenuItem
                onClick={async () => {
                  await toggleLock();
                  toast.success("บันทึกการเปลี่ยนแปลงแล้ว");
                }}
              >
                <span>{config.locked && "เ"}ปิดรับ</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Dialog>
        <SidebarMenuBadge>
          {length}
          {config.limit >= 0 ? `/${config.limit}` : ""}
        </SidebarMenuBadge>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function SubmissionList({
  subs,
}: {
  subs: {
    id: string;
    name: string;
    checked: boolean;
    queue: number | null;
    comment: string;
    uid: string;
  }[];
}) {
  const [query, setQuery] = useState("");
  return (
    <>
      <Input
        placeholder="ค้นหา..."
        type="search"
        onChange={(ev) => setQuery(ev.target.value.toLowerCase())}
      />
      {subs
        .filter((s) => (s.queue + s.name).toLowerCase().includes(query))
        .map((s) => (
          <SidebarMenuButton key={s.id} asChild>
            <SidebarLink submission={s} />
          </SidebarMenuButton>
        ))}
    </>
  );
}

export function Watcher() {
  const router = useRouter();
  const count = useRef<number | undefined>(undefined);
  // Reload after connection restored
  shared.signal("sync", () => router.refresh());

  useEffect(() => {
    const { clean } = sse.artifact.sub("update", () => router.refresh());
    const interval = setInterval(() => {
      fetch("/api/artifact/count")
        .then((r) => r.json())
        .then((r) => {
          if (typeof count.current === "undefined") count.current = r;
          if (count.current !== r) router.refresh();
          count.current = r;
        })
        .catch((e) => console.error("Fetching artifact count failed", e));
    }, 120000);
    return () => {
      clean();
      clearInterval(interval);
    };
  }, [router]);

  return <div></div>;
}
