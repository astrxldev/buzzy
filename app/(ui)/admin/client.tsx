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
    "header": "ความลับแห่งแรงจันทราผัน",
    "message": "แรงจันทราผัน (Kuuvahki) ใน Nod-Krai มีคุณสมบัติเหมือนแรงแม่เหล็ก ซึ่งเป็นกุญแจสำคัญในการแก้ปริศนาโบราณ"
  },
  {
    "header": "การล่าอันบ้าคลั่ง: Wild Hunt",
    "message": "เมื่อเผชิญหน้ากับกองทัพ Wild Hunt การลด HP ให้เหลือ 0 เป็นเพียงจุดเริ่มต้นเท่านั้น คุณต้องลดค่า Max HP ของพวกมันให้เหลือ 0 ในขณะที่พวกมันติดสถานะ Grief-Stricken เพื่อกำจัดพวกมันอย่างถาวร "
  },
  {
    "header": "ประกายจันทร์: Ascendant Gleam",
    "message": "การจัดทีมที่มีตัวละครจาก Nod-Krai อย่างน้อย 2 ตัว จะเปิดใช้งาน Ascendant Gleam เพื่อให้ใช้ความสามรถตัวละครได้อย่างเต็มที่"
  },
  {
    "header": "มรดกแห่งดวงจันทร์ทั้งสาม",
    "message": "Nod-Krai เคยถูกเรียกว่า Nephilheim และถูกเชื่อว่าเป็นเศษเสี้ยวของดวงจันทร์ดวงที่สี่ซึ่งแตกสลายก่อนจะก่อตัวเสร็จสิ้น ทำให้ดินแดนแห่งนี้มีความเชื่อมโยงกับพลังจันทราอย่างลึกซึ้ง"
  },
  {
    "header": "คำสาบานของผู้เฝ้าประภาคาร",
    "message": "กลุ่ม Lightkeepers ยึดถือคติ 'ใช้เลือดและกระดูกเป็นเชื้อเพลิง' พวกเขาเฝ้าประภาคารที่ Piramida มานานกว่า 500 ปีเพื่อไม่ให้ความมืดจาก Abyss ล่มสลายดินแดนของมนุษย์"
  },
  {
    "header": "อาวุธชำระล้าง Terpikeraunas",
    "message": "Arrow of Terpikeraunas เป็นโบราณวัตถุจาก Hyperborea ที่สามารถเปลี่ยนพลังงานจาก Light Realm ให้เป็นเปลวไฟที่ใช้บริสุทธิ์พลังงานจาก Void Realm (Abyss) ได้"
  },
  {
    "header": "วงล้อจันทรา: สิ่งมาก่อนวิชั่น",
    "message": "ใน Nod-Krai ผู้คนอาจได้รับ 'Moon Wheel' (กงล้อจันทรา) ซึ่งเป็นอุปกรณ์ที่ช่วยให้สามารถควบคุมแรงจันทราผันเพื่อปกป้องตนเองในถิ่นทุรกันดาร"
  },
  {
    "header": "การรุกรานของ Rerir",
    "message": "Rerir หนึ่งในห้ามหาบาปแห่ง Khaenri'ah เป็นผู้อยู่เบื้องหลังการโจมตีของ Wild Hunt เขามีเป้าหมายในการรวบรวมชิ้นส่วนของดวงจันทร์เพื่อฟื้นฟูร่างกายที่แตกสลายของตนเอง "
  },
  {
    "header": "เมืองสีทองที่ล่มสลาย Hyperborea",
    "message": "Hyperborea ตั้งอยู่ทางตอนเหนือสุดของ Nod-Krai เมืองนี้ล่มสลายลงหลังโดน Celestial Nail ปักใส่ ปัจจุบันกลายเป็นซากปรักหักพังที่เต็มไปด้วยความลับของภาพสะท้อนแห่งสวรรค์ "
  },
  {
    "header": "นวัตกรรมจาก Clink-Clank Krumkake",
    "message": "ร้านงานฝีมือ Krumkake เป็นศูนย์กลางของการประดิษฐ์ใน Nod-Krai มีการผสมผสานเทคโนโลยีเฟืองจาก Fontaine และพลังงานคูวากิเพื่อสร้างอุปกรณ์สำรวจที่ไม่มีใครเหมือน "
  },
  {
    "header": "ความเชื่อของลูกหลานจันทราน้ำค้างแข็ง",
    "message": "ลูกหลานจันทราน้ำค้างแข็งได้เคารพศรัทธาต่อ 'เทพจันทรา' และได้ละทิ้งอารยธรรมทองคำยุคเก่า"
  },
  // {
  //   "header": "สายใยครอบครัวในดินแดน Elysium",
  //   "message": "Nod-Krai ได้รับฉายาว่า Elysium เนื่องจากเป็นที่รวมตัวของคนนอกกฎหมายและนักผจญภัยจากทั่ว Teyvat ธีมหลักของตัวละครที่นี่จึงมักเป็นเรื่องของ 'ครอบครัวที่เลือกเอง' (Found Family) "
  // },
  {
    "header": "นกไนติงเกลของ Solovei",
    "message": "ตราสัญลักษณ์ของผู้เฝ้าประภาคารคือ นกไนติงเกลคาบไส้ตะเกียงที่ลุกไหม้ ซึ่งมาจากสัญลักษณ์ประจำตระกูลของ Solovei ผู้ก่อตั้งองค์กรและ Starshyna คนแรก "
  },
  {
    "header": "จันทราทั้ง 3",
    "message": "ในอดีตของ Teyvat เคยมีดวงจันทร์ทั้ง 3 ได้แก่ จันทราน้ำค้างแข็ง จันทราสีรุ้ง และจันทรานิรันดร์"
  },
  {
    "header": "Genshin impact",
    "message": "Action RPG แบบ Open World สไตล์อนิเมะ ที่โดดเด่นด้วยระบบการต่อสู้โดยใช้พลังธาตุและการสำรวจโลกกว้างที่อิสระ"
  }
];

  const [index, setIndex] = useState(-1);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * items.length));
  }, [items.length]);

  if (index === -1) return (
    <div className="flex flex-col gap-0.5 mt-1 items-center">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-64" />
    </div>
  );

  const item = items[index];

  return (
    <div className="flex flex-col gap-0.5 mt-1">
      <div className="text-sm flex items-center justify-center">{item.header}</div>
      <div className="opacity-60 text-xs ">{item.message}</div>
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
