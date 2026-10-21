"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { Pause, Play, Upload, Volume2, X } from "lucide-react";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormInput, useFormContext } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CurrencyInput } from "../rubgram/admin/@modal/manual/client";
import { donationAmountChangeHandler } from "./sound-amount";
import {
  constrainTrim,
  decodeSound,
  encodeSoundWav,
  isSoundEligible,
  isSoundTrimValid,
  MAX_SOUND_SECONDS,
  waveformPeaks,
} from "./sound-audio";

export function DonationAmountInput({
  onChange,
  ...props
}: ComponentProps<typeof CurrencyInput>) {
  const { values, setValue } = useFormContext();
  return (
    <CurrencyInput
      {...props}
      onChange={donationAmountChangeHandler(onChange, () => {
        if (values.sound != null) setValue("sound", null);
      })}
    />
  );
}

export function DonationSoundField() {
  return (
    <FormInput
      name="sound"
      label="อัปโหลดเสียง"
      subLabel="ไม่บังคับ · ไม่เกิน 30 วินาที"
    >
      <SoundUpload />
    </FormInput>
  );
}

function SoundUpload({
  value,
  onChange,
  id,
}: {
  value?: unknown;
  onChange?: (file: File | null) => void;
  id?: string;
}) {
  const { values, loading } = useFormContext();
  const [open, setOpen] = useState(false);
  const eligible = isSoundEligible(values.amount);
  const disabled = !eligible || loading;
  const file = value instanceof File ? value : null;
  return (
    <Dialog open={open && !disabled} onOpenChange={setOpen}>
      <div className="grid gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <DialogTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              className="min-w-0 flex-1 justify-start"
            >
              <Upload />
              <span className="truncate">
                {file ? file.name : "อัปโหลดเสียง"}
              </span>
            </Button>
          </DialogTrigger>
          {file && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="ลบเสียง"
              disabled={disabled}
              onClick={() => onChange?.(null)}
            >
              <X />
            </Button>
          )}
        </div>
        {!eligible && (
          <p className="text-xs text-muted-foreground">
            แนบเสียงได้เมื่อโดเนทตั้งแต่ 10 บาทขึ้นไป
          </p>
        )}
        {open && !disabled && (
          <SoundEditor
            initialFile={file}
            onCancel={() => setOpen(false)}
            onSave={(sound) => {
              if (!eligible) return;
              onChange?.(sound);
              setOpen(false);
            }}
          />
        )}
      </div>
    </Dialog>
  );
}

function SoundEditor({
  initialFile,
  onCancel,
  onSave,
}: {
  initialFile: File | null;
  onCancel: () => void;
  onSave: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [trim, setTrim] = useState<[number, number]>([0, 0]);
  const [volume, setVolume] = useState(100);
  const [busy, setBusy] = useState(Boolean(initialFile));
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const browseButton = useRef<HTMLButtonElement>(null);
  const playback = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const previewGain = useRef<GainNode | null>(null);
  const previewVersion = useRef(0);
  const peaks = useMemo(() => (buffer ? waveformPeaks(buffer) : []), [buffer]);
  const validTrim = isSoundTrimValid(trim);
  const overLimit = trim[1] - trim[0] > MAX_SOUND_SECONDS;

  function stop() {
    previewVersion.current++;
    if (source.current) {
      source.current.onended = null;
      source.current.stop();
      source.current.disconnect();
      source.current = null;
    }
    previewGain.current?.disconnect();
    previewGain.current = null;
    setPlaying(false);
  }

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    decodeSound(file, controller.signal)
      .then((decoded) => {
        setBuffer(decoded);
        setTrim([0, Math.min(MAX_SOUND_SECONDS, decoded.duration)]);
        setBusy(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "อ่านไฟล์เสียงนี้ไม่ได้ กรุณาลองไฟล์อื่น",
        );
        setBusy(false);
      });
    return () => controller.abort();
  }, [file]);

  useEffect(
    () => () => {
      previewVersion.current++;
      if (source.current) {
        source.current.onended = null;
        source.current.stop();
        source.current.disconnect();
      }
      previewGain.current?.disconnect();
      void playback.current?.close();
    },
    [],
  );

  function exportWav() {
    if (!buffer) throw new Error("กรุณาเลือกไฟล์เสียงก่อน");
    return encodeSoundWav(
      Array.from({ length: buffer.numberOfChannels }, (_, i) =>
        buffer.getChannelData(i),
      ),
      buffer.sampleRate,
      trim[0],
      trim[1],
      volume / 100,
    );
  }

  async function preview() {
    if (playing) {
      stop();
      return;
    }
    stop();
    const version = previewVersion.current;
    try {
      if (!buffer || trim[1] <= trim[0]) return;
      const context = playback.current ?? new AudioContext();
      playback.current = context;
      await context.resume();
      if (context.state === "closed" || previewVersion.current !== version)
        return;
      const node = context.createBufferSource();
      node.buffer = buffer;
      const gain = context.createGain();
      previewGain.current = gain;
      gain.gain.value = volume / 100;
      node.connect(gain);
      gain.connect(context.destination);
      node.onended = () => {
        node.disconnect();
        gain.disconnect();
        previewGain.current = null;
        source.current = null;
        setPlaying(false);
      };
      source.current = node;
      node.start(0, trim[0], trim[1] - trim[0]);
      setPlaying(true);
    } catch {
      if (previewVersion.current !== version) return;
      setError("เล่นตัวอย่างเสียงไม่ได้ กรุณาเลือกไฟล์อีกครั้ง");
    }
  }

  function save() {
    if (!buffer || busy || !validTrim) return;
    try {
      stop();
      const wav = exportWav();
      const name = (
        file?.name.replace(/\.[^.]+$/, "") || "donation-sound"
      ).slice(0, 80);
      onSave(new File([wav], `${name}.wav`, { type: "audio/wav" }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "บันทึกเสียงไม่ได้ กรุณาลองอีกครั้ง",
      );
    }
  }

  return (
    <DialogContent
      showCloseButton={false}
      className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        browseButton.current?.focus();
      }}
    >
      <DialogHeader>
        <DialogTitle>อัปโหลดเสียง</DialogTitle>
        <DialogDescription>
          เลือกช่วงเสียงสำหรับโดเนทให้ยาวไม่เกิน 30 วินาที
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <span className="text-sm font-medium">ตัวอย่างเสียง</span>
        <div className="flex items-center gap-4 rounded-md border bg-muted/40 p-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!buffer || busy || trim[1] <= trim[0]}
            aria-label={playing ? "หยุดตัวอย่างเสียง" : "เล่นช่วงเสียงที่เลือก"}
            onClick={() => void preview()}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <div className="min-w-0 flex-1">
            <div
              className="relative h-16 overflow-hidden rounded-sm"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 300 64"
                preserveAspectRatio="none"
                className="h-full w-full text-muted-foreground"
              >
                <title>รูปคลื่นเสียง</title>
                <path
                  d={peaks
                    .map(
                      (peak, index) =>
                        `M${index * 3},${32 - Math.max(1, peak * 30)}v${Math.max(2, peak * 60)}`,
                    )
                    .join(" ")}
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              {buffer && (
                <div
                  className="pointer-events-none absolute inset-y-0 border-x-2 border-primary bg-primary/15"
                  style={{
                    left: `${(trim[0] / buffer.duration) * 100}%`,
                    right: `${100 - (trim[1] / buffer.duration) * 100}%`,
                  }}
                />
              )}
            </div>
            <SliderPrimitive.Root
              className="relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50"
              role="group"
              aria-label="เลือกช่วงเสียงเป็นวินาที"
              value={trim}
              min={0}
              max={buffer?.duration || 1}
              step={0.01}
              minStepsBetweenThumbs={1}
              disabled={!buffer || busy}
              onValueChange={(next) => {
                stop();
                setTrim(constrainTrim(next, buffer?.duration || 0));
              }}
            >
              <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
                <SliderPrimitive.Range className="absolute h-full bg-primary" />
              </SliderPrimitive.Track>
              {["จุดเริ่มต้นของเสียง", "จุดสิ้นสุดของเสียง"].map((label, index) => (
                <SliderPrimitive.Thumb
                  key={label}
                  aria-label={label}
                  aria-valuetext={`${trim[index].toFixed(2)} วินาที`}
                  className="block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
                />
              ))}
            </SliderPrimitive.Root>
          </div>
        </div>
        <div
          className={cn(
            "flex justify-between text-xs tabular-nums",
            overLimit ? "text-destructive" : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          <span>
            {trim[0].toFixed(2)} – {trim[1].toFixed(2)} วินาที
          </span>
          <span>{(trim[1] - trim[0]).toFixed(2)} / 30.00 วินาที</span>
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="donation-sound-file" className="text-sm font-medium">
          ไฟล์เสียง
        </label>
        <div className="flex min-w-0 items-center gap-3 rounded-md border p-2 pl-3">
          <Upload className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm">
            {file?.name || "เลือกไฟล์เสียง"}
          </span>
          <Button
            ref={browseButton}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => input.current?.click()}
          >
            เลือกไฟล์
          </Button>
        </div>
        <input
          ref={input}
          id="donation-sound-file"
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={(event) => {
            const next = event.target.files?.[0];
            event.target.value = "";
            if (!next) return;
            stop();
            setBuffer(null);
            setTrim([0, 0]);
            setError("");
            setBusy(true);
            setFile(next);
          }}
        />
        <p className="text-xs text-muted-foreground">
          ขนาดไม่เกิน 10 MB และความยาวไม่เกิน 3 นาที
        </p>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Volume2 className="size-4" />
            ระดับเสียง
          </span>
          <span className="tabular-nums">{volume}%</span>
        </div>
        <SliderPrimitive.Root
          className="relative flex w-full touch-none items-center select-none"
          value={[volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={([next]) => {
            stop();
            setVolume(next);
          }}
        >
          <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label="ระดับเสียง"
            aria-valuetext={`${volume}%`}
            className="block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden"
          />
        </SliderPrimitive.Root>
      </div>
      {busy && (
        <output className="text-sm text-muted-foreground">
          กำลังอ่านไฟล์เสียง…
        </output>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button
          type="button"
          disabled={!buffer || busy || !validTrim}
          onClick={save}
        >
          บันทึก
        </Button>
      </DialogFooter>
      <DialogClose
        aria-label="ปิด"
        className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:size-4"
      >
        <X />
      </DialogClose>
    </DialogContent>
  );
}
