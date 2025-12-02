import {
  Badge,
  BookUser,
  Columns3Cog,
  Computer,
  Database,
  GitGraph,
  ListTree,
  MoreHorizontal,
  Package,
  PlusCircle,
  ScrollText,
  Settings,
  SquareUserRound,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SimpleTooltip } from "@/components/tooltip";
import {
  Dialog,
  DialogContent,
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/user";
import { db } from "@/lib/db";
import { versions } from "@/lib/db/schema";
import { SidebarLink, VersionCreateDialogForm } from "./client";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const vers = await db
    .select()
    .from(versions)
    .catch(() => [{ id: "..", name: "Error Fetching List." }]);
  const health: { database: boolean; enka: boolean; amber: boolean } =
    await fetch("http://localhost:3000/api/health").then((r) => r.json());

  return (
    <SidebarProvider>
      <Sidebar variant="floating">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/admin">
                <SidebarMenuButton
                  asChild
                  className="data-[slot=sidebar-menu-button]:p-1.5!"
                >
                  <span>
                    <Computer className="size-5!" />
                    <span className="text-base font-semibold">Buzzy Inc.</span>
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="pb-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <div className="flex justify-between w-full">
                      <div className="flex gap-1 [&>svg]:size-4 [&>svg]:shrink-0">
                        {/* Database */}
                        <SimpleTooltip text="Database">
                          <Database
                            className={
                              health.database
                                ? "text-emerald-400"
                                : "text-red-400"
                            }
                          />
                        </SimpleTooltip>{" "}
                        {/* Enka */}
                        <SimpleTooltip text="Enka Network API">
                          <UserRoundSearch
                            className={
                              health.enka ? "text-emerald-400" : "text-red-400"
                            }
                          />
                        </SimpleTooltip>{" "}
                        {/* Amber */}
                        <SimpleTooltip text="Project Amber">
                          <BookUser
                            className={
                              health.amber ? "text-emerald-400" : "text-red-400"
                            }
                          />
                        </SimpleTooltip>
                      </div>
                      <span>
                        {Object.values(health).some((x) => !x)
                          ? `${{ database: "ฐานข้อมูล", enka: "Enka ", amber: "Amber " }[Object.entries(health).find(([, v]) => !v)![0]]}มีปัญหา`
                          : "ปกติทุกอย่าง"}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Tierlist</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarLink href="/admin/tl/ver">
                    <GitGraph />
                    Versions
                  </SidebarLink>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarLink href="/admin/tl/badges">
                    <Badge />
                    Badges
                  </SidebarLink>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarLink href="/admin/tl/layout">
                    <Columns3Cog />
                    Layout
                  </SidebarLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Versions</SidebarGroupLabel>
            <Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarGroupAction>
                    <MoreHorizontal />
                  </SidebarGroupAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DialogTrigger asChild>
                    <DropdownMenuItem>
                      <PlusCircle /> Create...
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <Link href="/admin/ver/types">
                    <DropdownMenuItem>
                      <ListTree /> Types
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Version</DialogTitle>
                </DialogHeader>
                <VersionCreateDialogForm />
              </DialogContent>
            </Dialog>
            <SidebarGroupContent>
              <SidebarMenu>
                {vers.map((v) => (
                  <SidebarMenuItem key={v.id}>
                    <SidebarLink href={`/admin/ver/${v.id}`}>
                      {v.name}
                    </SidebarLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Global</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarLink href="/admin/char">
                    <SquareUserRound />
                    Characters
                  </SidebarLink>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarLink href="/admin/cdn">
                    <Package />
                    CDN
                  </SidebarLink>
                </SidebarMenuItem>
                <SidebarMenuItem className="mt-auto">
                  <SidebarLink href="/admin/log">
                    <ScrollText />
                    Audit Log
                  </SidebarLink>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarLink href="/admin/settings">
                    <Settings />
                    Settings
                  </SidebarLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <NavUser />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-transparent">{children}</SidebarInset>
    </SidebarProvider>
  );
}

export const dynamic = "force-dynamic";
