"use client";

import { Feather, Home, LoaderPinwheel, Table } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  if (!["/tl", "/artifact", "/rubgram"].includes(pathname)) return "";
  return (
    <div className="flex gap-2 p-2 rounded-lg absolute top-3 left-3 border bg-card">
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
      <Item icon={<Table size={16} />} name="จัดเทียร์ลิสต์" href="/tl" last />
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
        "group transition-[width] flex gap-1",
        divide && "border-r-2 -mr-1 pr-1",
      )}
      href={href}
    >
      {icon}{" "}
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap text-xs",
          "max-w-0 opacity-0",
          "group-hover:max-w-40 group-hover:opacity-100",
          "transition-all duration-300 ease-out delay-200",
          "-mr-1",
          divide || last || "border-r-2 -mr-3 pr-1",
          divide && "group-hover:mr-0",
        )}
      >
        {name}
      </span>
    </Link>
  );
}
