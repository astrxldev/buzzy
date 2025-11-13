"use client"; // Error boundaries must be Client Components

import { Activity, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Lost from "#/assets/lost_traveler.webp";
import Background from "#/bg.jpg";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export default function ErrorPage() {
  const [goingHome, goHome] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const messages = [
      "ไม่เจอเส้นทาง... เหมือนหลงในเทวสถานอีกแล้ว",
      "ไพม่อนบอกว่า หน้านี้ไม่มีอยู่จริง...",
      "อาร์ติแฟกต์ชิ้นนี้... หายไปในอากาศ",
      "โดนลบโดยอาร์คอนข้อมูล...",
      "พอร์ทัลนี้ปิดปรับปรุงชั่วคราว (หรือถาวรก็ไม่รู้)",
      "เหมือนจะเจอ แต่กลายเป็น DEF อีกแล้ว...",
      "เอเธอร์เดินผิดมิติ...",
      "หลุดเควสกลางทาง หน้านี้หายไปแล้ว",
      "ระบบแจ้งว่า '404 Element Not Found'",
      "แช่แข็งโดยหน้าเพจว่างเปล่า...",
      "ค้นหามาหลายชั้น ยังไม่เจอชิ้นนี้เลย",
      "โดนรีเซ็ตอินสแตนซ์ หน้านี้กลับเป็นศูนย์",
      "เพจนี้เหมือนคริไม่ติด... ว่างเปล่า",
      "หลงเข้าชั้น Abyss ที่ไม่มีทางออก",
      "ไพม่อนกิน URL ไปหมดแล้ว...",
    ];

    setMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, []);

  return (
    <>
      <Image
        src={Background}
        alt="Background"
        className="z-[-1] opacity-20 object-cover fixed top-0 left-0 w-full h-full"
      />
      <div className="h-full w-full bg-[#2225] backdrop-grayscale backdrop-blur-md flex flex-col gap-2 justify-center items-center">
        <div className="p-4 pb-12 bg-white shadow-lg rounded-sm rotate-1 max-sm:landscape:hidden">
          <Image
            src={Lost}
            alt="Lost Traveler"
            className="bg-gray-300 w-64 h-64 vintage-filter"
            width={256}
            height={256}
          />
        </div>
        <h2 className="font-bold text-2xl">404 ไม่พบหน้านี้</h2>
        <span>{message || <Skeleton className="h-6 w-40" />}</span>
        <div className="flex gap-2">
          <Link href="/">
            <Button
              onClick={() => {
                goHome(true);
              }}
              disabled={goingHome}
              variant="destructive"
            >
              {goingHome ? <Spinner /> : <Home />}
              กลับหน้าแรก
            </Button>
          </Link>
          <Link href="https://status.gunshiz.top">
            <Button variant="link" className="text-secondary-foreground">
              <Activity />
              สถานะเว็บไซต์
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
