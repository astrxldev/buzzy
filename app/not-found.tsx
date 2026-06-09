"use client"; // Error boundaries must be Client Components

import { Activity, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Dottore from "#/assets/dottore.webp";
import Background from "#/bg.webp";
import Image from "@/components/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export default function ErrorPage() {
  const [goingHome, goHome] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const messages = [
      "ตรงนี้ไม่มีที่หลบหมอนะ...",
      "ระวังหมอมาเจอตรงนี้นะ...",
      "ไม่มีที่ตรงนี้นะ ลองถามหมอด้านบนดูสิ...",
      "หมอกำลังมองหาหน้านี้อยู่...",
      "หน้านี้อาจโดนหมอทำลายไปแล้วนะ...",
    ];

    setMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, []);

  return (
    <>
      <Image
        src={Background}
        alt="Background"
        className="fixed top-0 left-0 z-[-1] h-full w-full object-cover opacity-20"
      />
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#2225] backdrop-blur-md backdrop-grayscale">
        <div className="rounded-sm bg-white p-4 pb-12 shadow-lg max-sm:landscape:hidden">
          <Image
            src={Dottore}
            alt="Dottore"
            className="vintage-filter h-64 w-64 bg-gray-300"
            width={256}
            height={256}
          />
        </div>
        <h2 className="text-2xl font-bold">404 ไม่พบหน้านี้</h2>
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
          <Link href="https://status.sudloh.com">
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
