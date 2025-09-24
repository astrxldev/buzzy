import { Dice3, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const subs = await db.select().from(submissions);
  return (
    <>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex justify-between items-center">
              <b>Admin</b>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="size-8">
                  <Dice3 size={24} className="size-6" />
                </Button>
                <Button variant="outline" size="icon" className="size-8">
                  <Trash2 size={24} className="size-6" />
                </Button>
              </div>
            </div>
            <Input placeholder="Search..." />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Submissions</SidebarGroupLabel>
              <SidebarMenu>
                {subs.map((s) => (
                  <SidebarMenuButton key={s.id}>
                    {s.name}
                    <SidebarMenuBadge>
                      <Checkbox className="mr-2" />
                    </SidebarMenuBadge>
                  </SidebarMenuButton>
                ))}
                {Array.from({ length: 5 }).map((_, index) => (
                  <SidebarMenuItem key={index.toString()}>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel>จำนวน</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Submissions are currently locked</p>
                      </TooltipContent>
                    </Tooltip>{" "}
                    จำนวน
                  </SidebarMenuButton>
                  <SidebarMenuBadge>5/15</SidebarMenuBadge>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
      {children}
    </>
  );
}
