"use client";

import { Bomb, FolderSync } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionButton } from "@/components/action-button";
import { CdnChooser } from "@/components/chooser";
import { Field, FieldDescription, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { shared } from "@/lib/comms";
import type { SlipProvider } from "@/lib/slip-checker";
import {
  forceRefresh,
  setSlipCheckProvider,
  syncAmber,
  toggleDonatePaymentMethod,
  toggleEnka,
} from "./api";
import { Broadcaster } from "./broadcaster";
import { Section } from "./section";

export function SettingsServicesSection({
  enka: enkaInitial,
  donPp: initialDonPp,
  donTmn: initialDonTmn,
  slipProvider: initialSlipProvider,
}: {
  enka: boolean;
  donPp: boolean;
  donTmn: boolean;
  slipProvider: SlipProvider;
}) {
  const [syncResult, setSyncResult] = useState("");
  const [enka, setEnka] = useState<boolean>(enkaInitial);
  const [donPp, setDonPp] = useState<boolean>(initialDonPp);
  const [donTmn, setDonTmn] = useState<boolean>(initialDonTmn);
  const [pathToReload, setPathToReload] = useState("");
  const [debug] = shared.state("debug");
  const [slipProvider, setSlipProvider] = useState(initialSlipProvider);
  const [savingSlipProvider, setSavingSlipProvider] = useState(false);

  async function changeSlipProvider(value: string) {
    if (
      (value !== "slipok" && value !== "slip2go") ||
      value === slipProvider ||
      savingSlipProvider
    )
      return;
    setSavingSlipProvider(true);
    try {
      const result = await setSlipCheckProvider(value);
      if (result.success) {
        setSlipProvider(result.provider);
        toast.success("เปลี่ยนบริการตรวจสอบสลิปแล้ว");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("ไม่สามารถเปลี่ยนบริการตรวจสอบสลิปได้ กรุณาลองใหม่");
    } finally {
      setSavingSlipProvider(false);
    }
  }

  async function sync() {
    return syncAmber().then(setSyncResult);
  }

  return (
    <Section title="บริการนอก">
      <div className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={enka}
            onCheckedChange={(v) => (
              setEnka(v),
              toggleEnka(v).then(forceRefresh.bind(null, "/artifact"))
            )}
          />
          เปิดใช้การดึงตัวละครใน Artifact
        </div>
        <div className="flex items-center gap-2">
          <ActionButton action={sync}>
            <FolderSync />
            Sync Amber
          </ActionButton>
          <ActionButton action={forceRefresh} variant="destructive">
            <Bomb />
            FORCE RELOAD
          </ActionButton>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="/path/prefix/to/reload"
            className="w-60"
            onChange={(v) => setPathToReload(v.target.value)}
          />
          <ActionButton
            action={forceRefresh.bind(null, pathToReload)}
            variant="destructive"
          >
            <Bomb />
            Reload
          </ActionButton>
        </div>
        <Field data-disabled={savingSlipProvider}>
          <FieldTitle id="slip-provider-label">บริการตรวจสอบสลิป</FieldTitle>
          <ToggleGroup
            type="single"
            variant="outline"
            value={slipProvider}
            onValueChange={changeSlipProvider}
            disabled={savingSlipProvider}
            aria-labelledby="slip-provider-label"
            aria-busy={savingSlipProvider}
            className="w-fit"
          >
            <ToggleGroupItem value="slipok">SlipOK</ToggleGroupItem>
            <ToggleGroupItem value="slip2go">Slip2Go</ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            ใช้สำหรับรับกรรมและโดเนท มีผลกับการตรวจสอบสลิปครั้งถัดไป
          </FieldDescription>
        </Field>
        <span>Donate Payment Method</span>
        <div className="flex items-center gap-2">
          <Switch
            checked={donPp}
            onCheckedChange={(v) => (
              setDonPp(v),
              toggleDonatePaymentMethod("donatePromptpay", v).then(
                forceRefresh.bind(null, "/donate"),
              )
            )}
          />
          Promptpay
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={donTmn}
            onCheckedChange={(v) => (
              setDonTmn(v),
              toggleDonatePaymentMethod("donateTruemoney", v).then(
                forceRefresh.bind(null, "/donate"),
              )
            )}
          />
          Truemoney
        </div>
        {debug && (
          <div className="grid w-fit gap-1 rounded-sm border border-dashed p-1">
            <span className="text-sm text-muted-foreground">
              Test file input
            </span>
            <CdnChooser onChange={alert} />
          </div>
        )}
        {syncResult && (
          <pre className="h-full rounded border bg-muted p-2">{syncResult}</pre>
        )}
        <Broadcaster />
      </div>
    </Section>
  );
}
