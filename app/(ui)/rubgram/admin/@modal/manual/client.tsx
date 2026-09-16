/** biome-ignore-all lint/a11y/noStaticElementInteractions: yes maam */
"use client";

import { FileSearch2, RefreshCw, TabletSmartphone, X } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { b2sClient } from "@/app/(ui)/admin/cdn/table";
import { VirtualizedComboBox } from "@/components/combobox";
import { useFormContext } from "@/components/form";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import type { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/action-button";
import { retrieveMobileUpload, startMobileUpload } from "./api";
import { sse } from "@/lib/db/sse-endpoints";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import QRCode from "react-qr-code";
import { Status, StatusIndicator } from "@/components/ui/status";

export function CurrencyInput(props: ComponentProps<typeof Input>) {
  return (
    <InputGroup>
      <InputGroupInput {...props} />
      <InputGroupAddon align="inline-end">฿</InputGroupAddon>
    </InputGroup>
  );
}

export function PriceInput() {
  const { values, setValue } = useFormContext();
  return (
    <div className="flex grow flex-col gap-2">
      <Label htmlFor="rg-price">Price</Label>
      <InputGroup>
        <InputGroupInput
          id="rg-price"
          type="number"
          placeholder="0"
          min={0}
          value={(values.price as string) ?? ""}
          onChange={(e) => setValue("price", e.target.value)}
        />
        <InputGroupAddon align="inline-end">บาท</InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function ServiceSelect({
  types,
  onValueChange,
  value = "",
}: {
  types: { id: string; display: string; price: number }[];
  onValueChange?: (v: string) => void;
  value?: string;
}) {
  return (
    <MultiSelect
      values={value?.split?.(",").filter(Boolean)}
      onValuesChange={(v) => onValueChange?.(v.filter(Boolean).join(","))}
    >
      <MultiSelectTrigger className="w-full">
        <MultiSelectValue placeholder="เลือกบริการ" />
      </MultiSelectTrigger>
      <MultiSelectContent search={false}>
        <MultiSelectGroup>
          {types.map((t) => (
            <MultiSelectItem value={t.id} key={t.id}>
              {t.display}{" "}
              <Kbd>
                {t.price} <span className="opacity-50">บาท</span>
              </Kbd>
            </MultiSelectItem>
          ))}
        </MultiSelectGroup>
      </MultiSelectContent>
    </MultiSelect>
  );
}

export function SlipUpload({
  value: externalValue,
  onValueChange,
}: {
  value?: File | null | undefined;
  onValueChange?: (value: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<File | undefined | null>(externalValue);
  const [muUploadKey, setMuUploadKey] = useState<string>();
  const [muState, setMuState] = useState<"waiting" | "connected" | "completed">(
    "waiting",
  );
  const [muReject, setMuReject] = useState<(reason?: any) => void>(() => {});
  const isSelected = !!value?.name;

  useEffect(() => {
    if (
      typeof externalValue === "object" &&
      externalValue &&
      Object.keys(externalValue).length === 0
    )
      // ignore {}
      return;
    setValue(externalValue);
  }, [externalValue]);

  function choose() {
    ref.current?.click();
  }

  async function mobileUpload() {
    setMuState("waiting");

    // 1. create sync entry
    const { trackingKey, accessKey, uploadKey } = await startMobileUpload();

    // 2. watch for slip_sync.complete for that tracking ID
    let completedResolve: () => void;
    const completedPromise = new Promise<void>(
      (r, j) => ((completedResolve = r), setMuReject(() => j)),
    );
    const ev = sse.slip_sync.subMany({
      complete(tid) {
        if (trackingKey !== tid) return;
        setMuState("completed");
        completedResolve();
      },
      connected(tid) {
        console.log(tid, trackingKey);
        if (trackingKey !== tid) return;
        setMuState("connected");
      },
    });

    // 3. show qr/share dialog
    setMuUploadKey(uploadKey);
    // window.open(`http://localhost:3000/donate/slip/${uploadKey}`);

    try {
      // 4. user open link on mobile
      // 5. user upload image
      // 6. image updates the sync entry and trigger slip_sync.complete
      await completedPromise;

      // 7. pc client fetch image and delete the sync entry
      const fd = await retrieveMobileUpload(accessKey);
      const f = fd.get("file") as File;
      const file = new File([f], fd.get("name") as string, {
        type: f.type,
        lastModified: f.lastModified,
      });

      // 8. pc client stop watch
      ev.clean();

      // 9. close dialog and set slip input?
      setMuUploadKey(undefined);
      console.log(file);
      setValue(file);
      onValueChange?.(file);
    } catch (e) {
      console.error(e);
      setMuUploadKey(undefined);
      ev.clean();

      throw e;
    }
  }

  return (
    <div className="flex flex-col">
      <Button
        onClick={isSelected ? undefined : () => ref.current?.click()}
        className={cn(
          "w-full justify-between",
          isSelected && "text-emerald-300!",
        )}
        variant="outline"
        type="button"
      >
        {isSelected ? (
          <span
            onClick={isSelected ? choose : undefined}
            className="min-w-0 truncate"
          >
            {value.name} <Kbd>{b2sClient(Number(value.size))}</Kbd>
          </span>
        ) : (
          "อัพโหลดสลิปโอนเงิน"
        )}
        {isSelected ? (
          <SimpleTooltip text="Unselect">
            <X
              className="pointer-events-auto! hover:text-red-500"
              onClick={() => {
                setValue(null);
                onValueChange?.(null);
              }}
            />
          </SimpleTooltip>
        ) : (
          <FileSearch2 />
        )}
      </Button>
      <div className="-mt-1 hidden justify-end md:flex">
        <ActionButton
          action={mobileUpload}
          variant="link"
          className="text-primary-foreground"
          type="button"
          text="อัพโหลดสลิปจากมือถือ"
        >
          <TabletSmartphone />
        </ActionButton>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={() => {
          const file = ref.current?.files?.[0] || null;
          setValue(file);
          onValueChange?.(file);
        }}
      />
      <Dialog
        open={!!muUploadKey}
        onOpenChange={(state) => state || muReject?.("user abort")}
      >
        <DialogContent>
          <DialogHeader className="font-semibold">
            อัพโหลดสลิปจากมือถือ
          </DialogHeader>
          <div className="flex flex-col items-center gap-5 py-10">
            <div className="rounded-xl bg-white p-4">
              <QRCode
                value={`https://buzz.sudloh.com/donate/slip/${muUploadKey}`}
                fgColor="#09090b"
                size={200}
              />
            </div>
            <span className="max-w-2/3 text-center whitespace-pre-wrap">
              สแกนด้วยโทรศัพท์เพื่อเลือกสลิปจาก Gallery และอัพโหลดโดยตรงมาที่นี่
            </span>
            <span className="flex items-center justify-between rounded-full border bg-card p-1 pr-3">
              {muState === "waiting" ? (
                <>
                  <Status status="degraded" className="bg-transparent">
                    <StatusIndicator />
                  </Status>
                  กำลังรอการเชื่อมต่อ
                </>
              ) : muState === "connected" ? (
                <>
                  <Status status="maintenance" className="bg-transparent">
                    <StatusIndicator />
                  </Status>
                  เชื่อมต่อแล้ว กำลังรออัพโหลดรูป
                </>
              ) : (
                <>
                  <Status status="online" className="bg-transparent">
                    <StatusIndicator />
                  </Status>
                  กำลังดาวน์โหลดเข้าเครื่องนี
                </>
              )}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function UserSelect({
  value,
  onValueChange,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<
    { username: string; uid: string; display: string }[]
  >([]);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/discord/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [bump]);

  return (
    <div className="flex w-full gap-1">
      <VirtualizedComboBox
        onValueSelect={onValueChange}
        defaultValue={value}
        placeholder="Select User"
        id="character"
        name="character"
        data={users.map((e) => ({
          label: (
            <>
              {e.display} <Kbd>{e.username}</Kbd>
            </>
          ),
          context: [e.display, e.username],
          value: e.uid,
        }))}
        className="grow bg-transparent! hover:bg-accent!"
      />
      <Button
        size="icon"
        variant="outline"
        onClick={() => setBump(Date.now())}
        disabled={loading}
        type="button"
      >
        {loading ? <Spinner /> : <RefreshCw />}
      </Button>
    </div>
  );
}
