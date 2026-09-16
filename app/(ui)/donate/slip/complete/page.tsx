import { Check } from "lucide-react";

export default function PageFileInput() {
  return (
    <div className="flex h-dvh bg-card/80 p-2">
      <div className="flex w-full flex-col items-center justify-center gap-4 rounded-lg border-4 border-dashed select-none">
        <div className="rounded-full bg-emerald-500/50 p-8">
          <Check className="size-8" />
        </div>
        <div className="text-xl">อัพโหลดเสร็จเรียบร้อย ปิดหน้านี้ได้</div>
      </div>
    </div>
  );
}
