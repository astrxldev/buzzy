"use client"; // Error boundaries must be Client Components

import {
  Activity,
  ArrowLeftRight,
  BookUser,
  Database,
  Home,
  RefreshCw,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Qiqi from "#/assets/qiqi.webp";
import Background from "#/bg.jpg";
import Image from "@/components/image";
import { SimpleTooltip } from "@/components/tooltip";
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
  const [health, setHealth] = useState<{
    database: boolean;
    enka: boolean;
    amber: boolean;
    red: boolean;
  }>();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);

    const messages = [
      "หลุดเรทอีกแล้ว...",
      "stamina หมด จมน้ำตาย...",
      "โดน Hilichurl(s) ดับ...",
      "Paimon กินหน้านี้ไปแล้ว...",
      "ไม่เหลือเพชรให้สุ่มแล้ว...",
      "ไม่ติดคริอีกแล้ว...",
      "ลงแต่ Def อีกแล้ว...",
      "เกลือแฟลกอีกแล้ว...",
      "น้ำแช่แข็งหน้านี้ไปแล้ว...",
      "กดผิด เผลอลบหน้านี้ทิ้ง...",
      "Zhongli ไม่อนุญาตให้ผ่าน...",
      "ได้ไม่ครบ 36 ดาวอีกแล้ว...",
      "Venti ไม่อนุญาตให้ผ่าน...",
      "Aether เดินสะดุดสายเซิพ...",
      "กด E แทน Q อีกแล้ว...",
      "บุสทำลายหน้านี้ไปแล้ว...",
    ];
    setMessage(messages[Math.floor(Math.random() * messages.length)]);

    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth);
  }, [error]);

  return (
    <>
      <Image
        src={Background}
        alt="Background"
        className="z-[-1] opacity-20 object-cover fixed top-0 left-0 w-full h-full"
      />
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
        <div className="flex gap-1 items-center">
          <Link href="https://status.sudloh.com" className="m-2 mr-0">
            <Button variant="link" className="text-secondary-foreground">
              <Activity />
              สถานะเว็บไซต์
            </Button>
          </Link>
          <div className="h-6/10 w-px bg-border mr-2"></div>
          {health ? (
            <div className="flex gap-1 [&>svg]:size-4 [&>svg]:shrink-0 items-center">
              <SimpleTooltip text="ฐานข้อมูล">
                <Database
                  className={
                    health.database ? "text-emerald-400" : "text-red-400"
                  }
                />
              </SimpleTooltip>
              <SimpleTooltip text="Enka Network">
                <UserRoundSearch
                  className={health.enka ? "text-emerald-400" : "text-red-400"}
                />
              </SimpleTooltip>
              <SimpleTooltip text="Project Amber">
                <BookUser
                  className={health.amber ? "text-emerald-400" : "text-red-400"}
                />
              </SimpleTooltip>
              <SimpleTooltip text="ระบบซิงค์">
                <ArrowLeftRight
                  className={health.red ? "text-emerald-400" : "text-red-400"}
                />
              </SimpleTooltip>
            </div>
          ) : (
            <div className="flex gap-1 items-center">
              <Skeleton className="size-4 rounded-xs" />
              <Skeleton className="size-4 rounded-xs" />
              <Skeleton className="size-4 rounded-xs" />
              <Skeleton className="size-4 rounded-xs" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
