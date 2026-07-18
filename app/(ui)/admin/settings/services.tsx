"use client";

import { Bomb, FolderSync } from "lucide-react";
import { useEffect, useState } from "react";
import { CdnChooser } from "@/components/chooser";
import { Switch } from "@/components/ui/switch";
import { shared } from "@/lib/comms";
import { forceRefresh, syncAmber, toggleEnka } from "./api";
import { Section } from "./page";
import { ActionButton } from "@/components/action-button";

export function SettingsServicesSection({
  enka: enkaInitial,
}: {
  enka: boolean;
}) {
  const [syncResult, setSyncResult] = useState("");
  const [enka, setEnka] = useState<boolean>();
  const [debug] = shared.state("debug");

  useEffect(() => {
    if (typeof enka !== "boolean") return setEnka(enkaInitial);
    toggleEnka(enka);
  }, [enka, enkaInitial]);

  async function sync() {
    return syncAmber().then(setSyncResult);
  }

  return (
    <Section title="บริการนอก">
      <div className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <Switch checked={enka} onCheckedChange={setEnka} />
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
