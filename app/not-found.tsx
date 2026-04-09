"use client"; // Error boundaries must be Client Components

import { Activity, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Dottore from "#/assets/dottore.webp";
import Background from "#/bg.jpg";
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
        className="z-[-1] opacity-20 object-cover fixed top-0 left-0 w-full h-full"
      />
      <div className="h-full w-full bg-[#2225] backdrop-grayscale backdrop-blur-md flex flex-col gap-2 justify-center items-center">
        <div className="p-4 pb-12 bg-white shadow-lg rounded-sm max-sm:landscape:hidden">
          <Image
            src={Dottore}
            alt="Dottore"
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
