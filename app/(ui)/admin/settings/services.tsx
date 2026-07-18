"use client";

import { Bomb, FolderSync } from "lucide-react";
import { useState } from "react";
import { CdnChooser } from "@/components/chooser";
import { Switch } from "@/components/ui/switch";
import { shared } from "@/lib/comms";
import {
  forceRefresh,
  syncAmber,
  toggleDonatePaymentMethod,
  toggleEnka,
} from "./api";
import { Section } from "./page";
import { ActionButton } from "@/components/action-button";
import { Input } from "@/components/ui/input";

export function SettingsServicesSection({
  enka: enkaInitial,
  donPp: initialDonPp,
  donTmn: initialDonTmn,
}: {
  enka: boolean;
  donPp: boolean;
  donTmn: boolean;
}) {
  const [syncResult, setSyncResult] = useState("");
  const [enka, setEnka] = useState<boolean>(enkaInitial);
  const [donPp, setDonPp] = useState<boolean>(initialDonPp);
  const [donTmn, setDonTmn] = useState<boolean>(initialDonTmn);
  const [pathToReload, setPathToReload] = useState("");
  const [debug] = shared.state("debug");

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
      </div>
    </Section>
  );
}
