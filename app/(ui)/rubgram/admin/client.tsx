"use client";

import { useProgress } from "@bprogress/next";
import { Lock, Logs, Unlock } from "lucide-react";
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
import { shared } from "@/lib/comms";
import { sse } from "@/lib/db/sse-endpoints";
import { cn } from "@/lib/utils";
import { setFree, setLimit, toggleCheck, toggleLock } from "../api";

export function SidebarLink({
  submission,
  className,
  prefetch = true,
}: {
  submission: { id: string; name: string; checked: boolean; queue: number };
  className?: string;
  prefetch?: boolean;
}) {
  const { stop } = useProgress();
  const { id } = useParams();
  const [checked, setChecked] = useState(submission.checked);

  useEffect(() => {
    setChecked(submission.checked);
  }, [submission.checked]);

  return (
    <Link
      href={`/rubgram/admin/${submission.id}`}
      className={cn(
        className,
        id === submission.id && "bg-accent text-accent-foreground",
      )}
      prefetch={prefetch}
      onClick={(ev) => {
        if ((ev.target as HTMLButtonElement).type === "button") {
          ev.preventDefault();
        }
      }}
    >
      {submission.queue}. {submission.name}
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
  );
}

export function LimitManager({
  config,
  length,
  ...props
}: React.ComponentProps<typeof SidebarMenu> & {
  config: Awaited<ReturnType<typeof import("../api").getEndgameConfig>>;
  length: number;
}) {
  const [dialog, setDialog] = useState(1);
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
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setDialog(1);
                  }}
                >
                  <span>ตั้งจำกัดคิว</span>
                </DropdownMenuItem>
              </DialogTrigger>
              <DropdownMenuItem
                onClick={async () => {
                  await toggleLock();
                  toast.success("บันทึกการเปลี่ยนแปลงแล้ว");
                }}
              >
                <span>{config.locked && "เ"}ปิดรับ</span>
              </DropdownMenuItem>
              <DialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setDialog(2);
                  }}
                >
                  <span>ตั้งจำนวนคิวฟรี</span>
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          {dialog === 1 ? (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ตั้งจำกัดคิว</DialogTitle>
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
                  autoFocus
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
          ) : (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ตั้งจำนวนคิวฟรี</DialogTitle>
              </DialogHeader>
              <form
                id="free-form"
                action={async (data: FormData) => {
                  await setFree(Number(data.get("free")) || 0);
                  toast.success("บันทึกการเปลี่ยนแปลงแล้ว");
                }}
              >
                <Input
                  id="free"
                  name="free"
                  type="number"
                  placeholder="ไม่ฟรีเลย"
                  defaultValue={config.free >= 0 ? config.free : ""}
                  autoFocus
                />
              </form>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">ยกเลิก</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button type="submit" form="free-form">
                    บันทึกการเปลี่ยนแปลง
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
        <SidebarMenuBadge>
          {length}
          {config.limit >= 0 ? `/${config.limit}` : ""}
          {config.free > 0 ? ` (เหลือคิวฟรี ${config.free})` : ""}
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
    queue: number;
    publicQueue: number;
    paid: boolean;
    archived: boolean;
  }[];
}) {
  const [query, setQuery] = useState("");
  const [debug] = shared.state("debug");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void debug;
    // Scrolls to the dummy div whenever 'items' changes
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [debug]);

  return (
    <>
      <Input
        placeholder="ค้นหา..."
        type="search"
        onChange={(ev) => setQuery(ev.target.value.toLowerCase())}
      />
      {subs
        .filter(
          (s) =>
            (debug || (s.paid && !s.archived)) &&
            (s.queue + s.name).toLowerCase().includes(query),
        )
        .map((s) => (
          <SidebarMenuButton
            key={s.id}
            asChild
            className={cn(((debug && !s.paid) || s.archived) && "opacity-50")}
          >
            <SidebarLink
              submission={debug ? s : { ...s, queue: s.publicQueue }}
              prefetch={!s.archived}
            />
          </SidebarMenuButton>
        ))}
      <div ref={bottomRef} />
    </>
  );
}

export function Watcher() {
  const router = useRouter();
  const count = useRef<number | undefined>(undefined);
  // Reload after connection restored
  shared.signal("sync", () => router.refresh());

  useEffect(() => {
    const { clean } = sse.rubgram.sub("update", () => router.refresh());
    const interval = setInterval(() => {
      fetch("/api/rubgram/count")
        .then((r) => r.json())
        .then((r) => {
          if (typeof count.current === "undefined") count.current = r;
          if (count.current !== r) router.refresh();
          count.current = r;
        })
        .catch((e) => console.error("Fetching rubgram count failed", e));
    }, 60000);
    return () => {
      clean();
      clearInterval(interval);
    };
  }, [router]);

  return <div></div>;
}

export function SlipButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => {
            window.location.href = "/rubgram/admin/slip";
          }}
        >
          <Logs size={24} className="size-6" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>All time คิว</p>
      </TooltipContent>
    </Tooltip>
  );
}
