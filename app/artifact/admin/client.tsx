"use client";

import { Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { setLimit, toggleCheck, toggleLock } from "@/lib/api";
import { cn } from "@/lib/utils";

export function SidebarLink({
  submission,
  className,
}: {
  submission: { id: string; name: string; checked: boolean; queue: number };
  className?: string;
}) {
  const { id } = useParams();
  return (
    <Link
      href={`/artifact/admin/${submission.id}`}
      className={cn(
        className,
        id === submission.id && "bg-accent text-accent-foreground",
      )}
    >
      {submission.queue}. {submission.name}
      <SidebarMenuBadge>
        <Checkbox
          className="mr-2 z-500"
          checked={submission.checked}
          onClick={() => toggleCheck(submission.id)}
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
  config: Awaited<ReturnType<typeof import("@/lib/api").getArtifactConfig>>;
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
                  <DialogTitle>Set limit</DialogTitle>
                </DialogHeader>
                <form
                  id="limit-form"
                  action={async (data: FormData) =>
                    setLimit(Number(data.get("limit")) || -1)
                  }
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
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button type="submit" form="limit-form">
                      Save changes
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
              <DropdownMenuItem onClick={toggleLock}>
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
