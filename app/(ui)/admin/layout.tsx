import { count, desc, eq, sql } from "drizzle-orm";
import {
  ArrowLeftRight,
  BadgeDollarSign,
  BitcoinIcon,
  BookUser,
  Columns3CogIcon,
  Compass,
  Computer,
  Database,
  ExternalLink,
  Grid3X3,
  IdCard,
  Layout,
  ListTree,
  MoreHorizontal,
  Package,
  PlusCircle,
  PlusIcon,
  ScrollText,
  Settings,
  SquareUserRound,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";
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
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/user";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions, versions } from "@/lib/db/schema";
import { SidebarLink, VersionCreateDialogForm } from "./client";
import { AdminNavbar } from "./navbar";

export default async function AdminLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  if (!(await adminCheck())) redirect("/login");

  const vers = db
    .select()
    .from(versions)
    .orderBy(desc(versions.id))
    .catch(() => [{ id: "..", name: "Error Fetching List." }]);

  const tlVersions = db
    .select({
      name: sql<string>`${tierlistTypes.name} || ' ' || ${tierlistVersions.name}`.as(
        "name",
      ),
      url: sql<string>`${tierlistVersions.type} || '/' || ${tierlistVersions.id}`,
    })
    .from(tierlistVersions)
    .orderBy(tierlistTypes.order, tierlistVersions.order)
    .innerJoin(tierlistTypes, eq(tierlistTypes.id, tierlistVersions.type))
    .catch(() => []);

  const tlTypes = db
    .select({
      id: tierlistTypes.id,
      name: tierlistTypes.name,
      count: count(tierlistVersions.id),
    })
    .from(tierlistTypes)
    .orderBy(tierlistTypes.id)
    .leftJoin(tierlistVersions, eq(tierlistTypes.id, tierlistVersions.type))
    .groupBy(tierlistTypes.id)
    .catch(() => []);

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
              <Suspense
                fallback={
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>Loading...</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                }
              >
                <HealthStatus />
              </Suspense>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Tierlist</SidebarGroupLabel>
            <SimpleTooltip text="Create new type...">
              <SidebarGroupAction asChild>
                <Link href="/admin/tl/ver/create">
                  <PlusIcon />
                </Link>
              </SidebarGroupAction>
            </SimpleTooltip>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarLink href="/admin/tl/layout">
                    <Columns3CogIcon /> Layout Editor
                  </SidebarLink>
                </SidebarMenuItem>
                <Suspense>
                  <TierlistList types={tlTypes} />
                </Suspense>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Guide</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarLink href="/admin/guide">
                    <Compass />
                    Editor
                  </SidebarLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Versions [WIP]</SidebarGroupLabel>
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
                <Suspense>
                  <VersionsList versions={vers} />
                </Suspense>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Global</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Suspense
                  fallback={
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled>
                          <ExternalLink />
                          Admin Pages
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  }
                >
                  <AdminShortcuts versions={tlVersions} />
                </Suspense>
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
      <SidebarInset className="bg-transparent">
        <Suspense>
          <AdminNavbarLoader
            adminShortcuts={tlVersions}
            tierlistTypes={tlTypes}
            tierlistVersions={vers}
          />
        </Suspense>
        {modal}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

async function HealthStatus() {
  const health: {
    database: boolean;
    enka: boolean;
    amber: boolean;
    red: boolean;
  } = await fetch("http://localhost:3000/api/health").then((r) => r.json());

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton>
          <div className="flex w-full justify-between">
            <div className="flex gap-1 [&>svg]:size-4 [&>svg]:shrink-0">
              {/* Database */}
              <SimpleTooltip text="Database">
                <Database
                  className={
                    health.database ? "text-emerald-400" : "text-red-400"
                  }
                />
              </SimpleTooltip>{" "}
              {/* Enka */}
              <SimpleTooltip text="Enka Network API">
                <UserRoundSearch
                  className={health.enka ? "text-emerald-400" : "text-red-400"}
                />
              </SimpleTooltip>{" "}
              {/* Amber */}
              <SimpleTooltip text="Project Amber">
                <BookUser
                  className={health.amber ? "text-emerald-400" : "text-red-400"}
                />
              </SimpleTooltip>
              {/* Cache */}
              <SimpleTooltip text="Redis Cache/SSE">
                <ArrowLeftRight
                  className={health.red ? "text-emerald-400" : "text-red-400"}
                />
              </SimpleTooltip>
            </div>
            <span>
              {Object.values(health).some((x) => !x)
                ? `${((h: string) => ({ database: "ฐานข้อมูล", enka: "Enka ", amber: "Amber ", red: "SSE " })[h] ?? `${h} `)(Object.entries(health).find(([, v]) => !v)![0])}มีปัญหา`
                : "ปกติทุกอย่าง"}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

async function AdminNavbarLoader({
  adminShortcuts,
  tierlistTypes,
  tierlistVersions,
}: {
  adminShortcuts: Promise<
    {
      name: string;
      url: string;
    }[]
  >;
  tierlistTypes: Promise<
    {
      id: string;
      name: string;
      count: number;
    }[]
  >;
  tierlistVersions: Promise<
    {
      id: string;
      name: string;
    }[]
  >;
}) {
  return (
    <AdminNavbar
      adminShortcuts={await adminShortcuts}
      tierlistTypes={await tierlistTypes}
      tierlistVersions={await tierlistVersions}
    />
  );
}

async function TierlistList({
  types: prom,
}: {
  types: Promise<{ id: string; name: string; count: number }[]>;
}) {
  const types = await prom;
  return types.map((t) => (
    <SidebarMenuItem key={t.id}>
      <SidebarLink href={`/admin/tl/${t.id}`}>
        <Layout />
        {t.name}
        <SidebarMenuBadge>{t.count}</SidebarMenuBadge>
      </SidebarLink>
    </SidebarMenuItem>
  ));
}

async function VersionsList({
  versions: prom,
}: {
  versions: Promise<
    {
      id: string;
      name: string;
    }[]
  >;
}) {
  const vers = await prom;
  return (
    <>
      {vers.map((v) => (
        <SidebarMenuItem key={v.id}>
          <SidebarLink href={`/admin/ver/${v.id}`} disabled>
            {v.name}
          </SidebarLink>
        </SidebarMenuItem>
      ))}
    </>
  );
}

async function AdminShortcuts({
  versions: prom,
}: {
  versions: Promise<{ name: string; url: string }[]>;
}) {
  const versions = await prom;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton>
              <ExternalLink />
              Admin Pages
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="rounded-lg"
            side="right"
            align="start"
          >
            <DropdownMenuItem asChild>
              <Link href="/artifact/admin">
                <IdCard />
                Artifact
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/rubgram/admin">
                <BadgeDollarSign />
                Rubgram
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/donate/admin">
                <BitcoinIcon />
                Donate
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Grid3X3 />
                Tierlist
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {versions.map((v) => (
                    <DropdownMenuItem key={v.url} asChild>
                      <Link href={`/tl/${v.url}/admin`}>{v.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export const dynamic = "force-dynamic";
