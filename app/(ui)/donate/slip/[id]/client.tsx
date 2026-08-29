// oxlint-disable next/no-img-element
"use client";

import { Upload } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { CircularProgress } from "@/components/customized/progress/circular-progress";

export function PageFileInput({
  onValueChange,
}: {
  onValueChange?: (value: File) => void;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const submitButton = useRef<HTMLButtonElement | null>(null);
  const [value, setValue] = useState<File | undefined>();
  const [progress, setProgress] = useState(0);
  const updateFormValue = useEffectEvent((file: File) => {
    onValueChange?.(file);
  });
  useEffect(() => {
    if (!value) return;
    updateFormValue(value);
    setTimeout(() => submitButton.current?.click(), 100);
    setProgress(0);
    const start = Date.now();

    const interval = setInterval(() => {
      const t = Math.min((Date.now() - start) / 10000, 1);
      const eased = 1 - Math.pow(1 - t, 2);

      setProgress(eased * 100);

      if (t >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [value]);
  return (
    <div
      className="flex h-dvh bg-card/80 p-2"
      onClick={() => fileInput.current?.click()}
    >
      <div className="flex w-full flex-col items-center justify-center gap-4 rounded-lg border-4 border-dashed select-none">
        {value ? (
          <>
            <CircularProgress
              circleStrokeWidth={12}
              labelClassName="text-xl font-bold"
              progressStrokeWidth={6}
              renderLabel={(progress) => `${progress}%`}
              showLabel
              size={120}
              value={Math.round(progress)}
            />
            <div className="text-sm">กำลังอัพโหลด กรุณาอย่าปิดหน้านี้</div>
          </>
        ) : (
          <>
            <div className="rounded-full bg-primary/50 p-8">
              <Upload className="size-8" />
            </div>
            <div className="text-xl">แตะเพื่อเลือกไฟล์สลิป</div>
          </>
        )}
      </div>
      <input
        accept="image/*"
        type="file"
        hidden
        ref={fileInput}
        onChange={() => setValue(fileInput.current?.files?.[0])}
      />
      <button type="submit" ref={submitButton} />
    </div>
  );
}
