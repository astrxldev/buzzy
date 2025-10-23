"use client"; // Error boundaries must be Client Components

import { Activity, Home, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Qiqi from "#/assets/qiqi.webp";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [goingHome, goHome] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);

    const messages = [
      "แพ้ 50/50 อีกแล้ว...",
      "จมน้ำตายหน้าชายฝั่ง...",
      "โดนฮิลิเชอร์ลตบดับ...",
      "ไพม่อนกินคำสั่งไปแล้ว...",
      "หมดเพชร หมดใจ...",
      "คริไม่ติดเลยสักที...",
      "ชิ้นส่วนนี้กลายเป็น DEF แบน...",
      "หลุดสัญญาณเหมือนหลุดอาร์ติแฟกต์ดีๆ...",
      "แช่แข็งโดยเมจน้ำแข็ง...",
      "กดสกิลพลาด คูลดาวน์กินเวลาอีกแล้ว...",
      "La Baguette... แห่งความพัง",
      "แพ้ชั้น 12 อีกแล้วเหรอ...",
      "เซเลสเทียไม่อนุญาตให้ผ่าน...",
      "เอเธอร์สะดุดสายแลน...",
      "กด E แทน Q ไปอีกแล้ว...",
    ];
    setMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, [error]);

  return (
    <div className="h-full w-full bg-[#8225] backdrop-hue-rotate-60 backdrop-blur-md flex flex-col gap-2 justify-center items-center">
      <div className="h-full flex flex-col gap-2 justify-center items-center">
        <div className="p-4 pb-12 bg-white shadow-lg rounded-sm rotate-1 max-sm:landscape:hidden">
          <Image
            src={Qiqi}
            alt="Qiqi"
            className="bg-gray-300 w-full vintage-filter"
          />
        </div>
        <h2 className="font-bold text-2xl">เกิดข้อผิดพลาดขึ้น</h2>
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
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => {
                setLoading(true);
                setTimeout(() => reset(), 500);
              }
            }
            disabled={loading}
            variant="secondary"
          >
            {loading ? <Spinner /> : <RefreshCw />}
            ลองใหม่
          </Button>
        </div>
      </div>
      <Link href="https://status.gunshiz.top" className="m-2">
        <Button variant="link" className="text-secondary-foreground">
          <Activity />
          สถานะเว็บไซต์
        </Button>
      </Link>
    </div>
  );
}
