"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function VersionCreateDialogForm() {
  return <form>Todo</form>;
}

export function RandomWelcomeMessage() {
  const items = [
    {
      header: "ไป Snezhnaya ได้ตั้งแต่ AR 18",
      message:
        "เมื่อจบ Archon Quest Prologue: Act III แล้ว จุด Teleport Waypoint ที่นำไปยัง Snezhnaya จะปลดล็อกให้อัตโนมัติ โดยไม่ต้องจบเควสต์ของภูมิภาคอื่นก่อน",
    },
    {
      header: "ห้าพื้นที่ใหม่ในเวอร์ชัน 7.0",
      message:
        "Snezhnaya เปิดให้สำรวจ Volkodlak Tundra, White Birch Snowgrave, Everfrozen Earth, Flamefeather Valley และ Fellfrost Peak ในเวอร์ชัน 7.0",
    },
    {
      header: "อย่าลืมเก็บ Cryo Sigil",
      message:
        "Cryo Sigil ที่พบระหว่างสำรวจ Snezhnaya ใช้สร้างและเพิ่มเลเวล Meeting Points เพื่อรับเสบียงและรางวัลเพิ่มเติม",
    },
    {
      header: "Meeting Points สามแห่ง",
      message:
        "Meeting Points ในเวอร์ชัน 7.0 ได้แก่ Tidesong Cavern, Huntsman's Cabin และ The Korolevskiy Theater ปลดล็อกได้จากเนื้อเรื่อง Act I",
    },
    {
      header: "ปลดล็อก Daily Commission",
      message:
        "ต้องเล่น Archon Quest Chapter VII: Act I จนถึงช่วง Great Deeds on the Tundra ก่อน จึงจะเปิด Daily Commission ของ Snezhnaya ได้",
    },
    {
      header: "Traveler ใช้ธาตุ Cryo ได้แล้ว",
      message:
        "นำ Traveler ไปสั่นพ้องกับ Statue of The Seven ใน Snezhnaya เพื่อปลดล็อกธาตุ Cryo ซึ่งเล่นได้ทั้งแบบลงสนามและสลับมาทำดาเมจนอกสนาม",
    },
    {
      header: "Stellar Conduct",
      message:
        "เมื่อมีตัวละครที่เปิดใช้ Stellar Glimmer อยู่ในทีม ปฏิกิริยา Electro + Cryo จะเปลี่ยนจาก Superconduct เป็น Stellar Conduct และสร้าง Polestar Field",
    },
    {
      header: "Stellar Swirl",
      message:
        "Stellar Swirl เกิดจาก Anemo + Cryo เมื่อมีตัวเปิดใช้ปฏิกิริยาในทีม โดยจะสร้าง Stellar Vortex ที่ระเบิดเป็นความเสียหาย Cryo หลังเวลาหนึ่ง",
    },
    {
      header: "Odette ตัวช่วยปฏิกิริยาใหม่",
      message:
        "Odette เป็นตัวละคร Cryo ดาบ 5 ดาวที่เปิดใช้ Stellar Conduct และ Stellar Swirl พร้อมสร้างความเสียหาย Stellar Glimmer จากนอกสนาม",
    },
    {
      header: "รับ Alyosha ฟรีจากเนื้อเรื่อง",
      message:
        "Alyosha เป็นตัวละคร Electro หอก 4 ดาวที่รับได้จาก Archon Quest Chapter VII: Act I เขาช่วยฮีลและสร้างความเสียหาย Electro ต่อเนื่องได้",
    },
    {
      header: "ดาบ 5 ดาวฟรีสำหรับ Traveler",
      message:
        "Exaiphanes Blade รับได้จาก Archon Quest Everwinter Without Mercy และในเวอร์ชัน 7.0 สามารถขัดเกลาถึง R3 ผ่าน Statue of The Seven ใน Snezhnaya",
    },
    {
      header: "อาร์ติแฟกต์จาก Inverted Glacier",
      message:
        "Domain Inverted Glacier ใน Everfrozen Earth มีเซ็ต Scarlet Proof และ Heart of the Furnace ซึ่งออกแบบมาสำหรับทีม Stellar Glimmer",
    },
    {
      header: "อาวุธคราฟต์ใหม่ครบห้าประเภท",
      message:
        "เวอร์ชัน 7.0 เพิ่มสูตรอาวุธคราฟต์ 4 ดาวของ Snezhnaya สำหรับ Sword, Claymore, Polearm, Catalyst และ Bow โดยเน้นทีมปฏิกิริยา Stellar Glimmer",
    },
    {
      header: "แวะสมาคมตกปลา Snezhnaya",
      message:
        "Snezhnaya มี Fishing Association และจุดตกปลาใหม่ อย่าลืมสำรวจแหล่งน้ำเพื่อจับปลาและนำไปแลกรางวัลประจำภูมิภาค",
    },
  ];

  const [index, setIndex] = useState(-1);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * items.length));
  }, [items.length]);

  if (index === -1)
    return (
      <div className="mt-1 flex flex-col items-center gap-0.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
    );

  const item = items[index];

  return (
    <div className="mt-1 flex flex-col gap-0.5">
      <div className="flex items-center justify-center text-sm">
        {item.header}
      </div>
      <div className="text-xs opacity-60 ">{item.message}</div>
    </div>
  );
}

export function SidebarLink({
  className,
  children,
  href,
  disabled,
  ...props
}: React.ComponentProps<typeof Link> & { disabled?: boolean }) {
  const target = useMemo(
    () =>
      href
        ? new URL(href.toString(), "https://example.com").pathname
        : undefined,
    [href],
  );
  const pathname = usePathname();
  return (
    <SidebarMenuButton
      disabled={disabled}
      className={cn(target === pathname ? "bg-accent" : "", className)}
      asChild={!disabled}
    >
      {disabled ? (
        children
      ) : (
        <Link href={href} {...props}>
          {children}
        </Link>
      )}
    </SidebarMenuButton>
  );
}
