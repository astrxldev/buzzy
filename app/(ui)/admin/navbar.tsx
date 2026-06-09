"use client";

import {
  AlignJustify,
  Badge,
  BadgeDollarSign,
  ChevronRight,
  Columns3Cog,
  Compass,
  ExternalLink,
  Form,
  GitGraph,
  Grid3x3,
  Home,
  IdCard,
  List,
  Package,
  Plus,
  ScrollText,
  Server,
  Settings,
  Table,
  UserSquare2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type NavbarEntry = {
  name: string;
  icon: ComponentType<{ size?: number; name?: string; className?: string }>;
  divide?: boolean;
  last?: boolean;
} & ({ href: string; sub?: never } | { sub: NavbarEntry[]; href?: never });

function VersionBadge({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  return (
    <span className={cn("text-[10px] leading-none font-bold", className)}>
      {name?.match(/[0-9.]+$/)?.[1]}
    </span>
  );
}

function isActive(entry: NavbarEntry, pathname: string): boolean {
  if ("href" in entry && entry.href)
    return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
  if ("sub" in entry && entry.sub)
    return entry.sub.some((s) => isActive(s, pathname));
  return false;
}

function findActiveParent(
  items: NavbarEntry[],
  pathname: string,
): NavbarEntry | null {
  for (const item of items) {
    if ("sub" in item && item.sub) {
      if (item.sub.some((s) => isActive(s, pathname))) return item;
    }
  }
  return null;
}

function DropdownMenu({
  items,
  showLabels,
  onClose,
  depth = 0,
}: {
  items: NavbarEntry[];
  showLabels: boolean;
  onClose: () => void;
  depth?: number;
}) {
  const pathname = usePathname();
  const [openSub, setOpenSub] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "flex min-w-40 flex-col gap-0.5",
        depth > 0 && "ml-2 border-l border-white/10 pl-2",
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item, pathname);
        const hasSub = "sub" in item && item.sub;
        const isOpen = openSub === item.name;

        return (
          <div key={item.name}>
            {hasSub ? (
              <>
                <button
                  type="button"
                  onClick={() => setOpenSub(isOpen ? null : item.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left",
                    "text-[13px] transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon size={16} name={item.name} className="shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  <ChevronRight
                    size={14}
                    className={cn(
                      "transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                </button>
                {isOpen && (
                  <DropdownMenu
                    items={item.sub!}
                    showLabels={showLabels}
                    onClose={onClose}
                    depth={depth + 1}
                  />
                )}
              </>
            ) : (
              <Link
                href={item.href!}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2",
                  "text-[13px] transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={16} name={item.name} className="shrink-0" />
                <span>{item.name}</span>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AdminNavbar({
  adminShortcuts,
  tierlistVersions,
}: {
  adminShortcuts: {
    name: string;
    url: string;
  }[];
  tierlistVersions: {
    id: string;
    name: string;
  }[];
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [showLabels, setShowLabels] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const items: NavbarEntry[] = [
    { name: "หน้าหลัก", href: "/admin", icon: Home, divide: true },
    {
      name: "Tierlist",
      icon: Table,
      sub: [
        { name: "Versions", icon: GitGraph, href: "/admin/tl/ver" },
        { name: "Badges", icon: Badge, href: "/admin/tl/badges" },
        { name: "Layout", icon: Columns3Cog, href: "/admin/tl/layout" },
      ],
    },
    { name: "Guide", icon: Compass, href: "/admin/guide" },
    {
      name: "Versions",
      icon: List,
      sub: [
        { name: "Types", icon: Form, href: "/admin/ver/types" },
        { name: "Create", icon: Plus, href: "/admin/ver/create" },
        ...tierlistVersions.map((v) => ({
          name: v.name,
          icon: VersionBadge,
          href: `/admin/ver/${v.id}`,
        })),
      ],
    },
    {
      name: "Global",
      icon: Server,
      sub: [
        {
          name: "Admin Pages",
          icon: ExternalLink,
          sub: [
            { name: "Artifact", icon: IdCard, href: "/artifact/admin" },
            { name: "Rubgram", icon: BadgeDollarSign, href: "/rubgram/admin" },
            {
              name: "Tierlist",
              icon: Grid3x3,
              sub: adminShortcuts.map((s) => ({
                name: s.name,
                icon: VersionBadge,
                href: `/tl/${s.url}/admin`,
              })),
            },
          ],
        },
        { name: "Characters", icon: UserSquare2, href: "/admin/char" },
        { name: "CDN", icon: Package, href: "/admin/cdn" },
        { name: "Audit Log", icon: ScrollText, href: "/admin/log" },
        { name: "Settings", icon: Settings, href: "/admin/settings" },
      ],
    },
  ];

  const [scopeOverride, setScopeOverride] = useState<"root" | null>(null);

  // Reset override whenever pathname changes (navigating resets scope)
  // biome-ignore lint/correctness/useExhaustiveDependencies: used for other purepose
  useEffect(() => {
    setScopeOverride(null);
  }, [pathname]);

  const activeParent =
    scopeOverride === "root" ? null : findActiveParent(items, pathname);
  const prefixParent =
    scopeOverride === "root" ? findActiveParent(items, pathname) : activeParent;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isMobile) return "";

  return (
    <div ref={navRef} className="sticky top-0 z-49">
      <div className="flex items-center gap-1 border-b border-white/10 bg-card/75 px-2 py-1.5 backdrop-blur-sm">
        <div className="flex shrink-0 items-center gap-1">
          {prefixParent && (
            <button
              type="button"
              onClick={() =>
                setScopeOverride(scopeOverride === "root" ? null : "root")
              }
              className={cn(
                "flex h-8 w-6 items-center justify-center rounded opacity-50 transition-colors hover:opacity-100",
                scopeOverride === "root" && "bg-white/15 opacity-100",
              )}
            >
              <prefixParent.icon size={14} name={prefixParent.name} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLabels((v) => !v)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded transition-colors",
              showLabels
                ? "bg-white/15 text-white"
                : "text-white/40 hover:text-white/70",
            )}
          >
            {showLabels ? <X size={16} /> : <AlignJustify size={16} />}
          </button>
          <div className="mx-1 h-5 w-px bg-white/10" />
        </div>

        <div className="flex min-w-0 flex-1 scrollbar-none items-center gap-1 overflow-x-auto">
          {(activeParent ? activeParent.sub! : items).map((item) => {
            const Icon = item.icon;
            const active = isActive(item, pathname);
            const hasSub = "sub" in item && item.sub;
            const isOpen = openDropdown === item.name;

            const buttonContent = (
              <>
                <Icon size={18} name={item.name} className="shrink-0" />
                {showLabels && (
                  <span className="text-[11px] leading-none whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </>
            );

            const buttonClass = cn(
              "flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5 transition-colors",
              active || isOpen
                ? "bg-white/15 text-white"
                : "text-white/50 hover:bg-white/10 hover:text-white",
            );

            if (hasSub) {
              return (
                <button
                  key={item.name}
                  onClick={() => setOpenDropdown(isOpen ? null : item.name)}
                  className={buttonClass}
                  type="button"
                >
                  {buttonContent}
                </button>
              );
            }

            return (
              <Link key={item.name} href={item.href!} className={buttonClass}>
                {buttonContent}
              </Link>
            );
          })}
        </div>
      </div>

      {openDropdown &&
        (() => {
          const entry = (activeParent ? activeParent.sub! : items).find(
            (i) => i.name === openDropdown,
          );
          if (!entry || !("sub" in entry) || !entry.sub) return null;
          return (
            <div className="absolute top-full right-0 left-0 z-50 mt-1">
              <div className="rounded-lg border border-white/10 bg-card/95 p-2 shadow-xl backdrop-blur-sm">
                <DropdownMenu
                  items={entry.sub}
                  showLabels={showLabels}
                  onClose={() => setOpenDropdown(null)}
                />
              </div>
            </div>
          );
        })()}
    </div>
  );
}
