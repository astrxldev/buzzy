"use client";

import {
  Bitcoin,
  Feather,
  Home,
  LoaderPinwheel,
  StickyNote,
  Table,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const mobile = useIsMobile();

  if (
    !/^\/(?:tl(?:\/[a-zA-Z0-9]+)?|rubgram|artifact|guide|donate)$/gm.test(
      pathname,
    )
  )
    return "";
  return (
    <div
      className={cn(
        "absolute flex gap-2 rounded-lg border bg-card p-2",
        mobile && pathname === "/guide" ? "top-2 right-2" : "top-3 left-3",
      )}
    >
      <Item icon={<Home size={16} />} name="หน้าหลัก" href="/" divide />
      <Item
        icon={<Feather size={16} />}
        name="เสือกไอดีชาวบ้าน"
        href="/artifact"
      />
      <Item
        icon={<LoaderPinwheel size={16} />}
        name="รับกรรมแทนทางบ้าน"
        href="/rubgram"
      />
      <Item icon={<Table size={16} />} name="จัดเทียร์ลิสต์" href="/tl" />
      <Item icon={<StickyNote size={16} />} name="ไกด์ตัวละคร" href="/guide" />
      <Item icon={<Bitcoin size={16} />} name="โดเนท" href="/donate" last />
    </div>
  );
}

function Item({
  icon,
  href,
  name,
  divide = false,
  last = false,
}: {
  icon: ReactNode;
  name: string;
  href: string;
  divide?: boolean;
  last?: boolean;
}) {
  return (
    <Link
      className={cn(
        "group flex gap-1 transition-[width]",
        divide && "-mr-1 border-r-2 pr-1",
      )}
      href={href}
    >
      {icon}{" "}
      <span
        className={cn(
          "overflow-hidden text-xs whitespace-nowrap",
          "max-w-0 opacity-0",
          "group-hover:max-w-40 group-hover:opacity-100",
          "transition-all delay-200 duration-300 ease-out",
          "-mr-1",
          divide || last || "-mr-3 border-r-2 pr-1",
          divide && "group-hover:mr-0",
        )}
      >
        {name}
      </span>
    </Link>
  );
}
