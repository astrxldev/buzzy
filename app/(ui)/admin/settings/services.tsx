"use client";

import { FolderSync } from "lucide-react";
import { useEffect, useState } from "react";
import { CdnChooser } from "@/components/chooser";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { shared } from "@/lib/comms";
import { syncAmber, toggleEnka } from "./api";
import { Section } from "./page";

export function SettingsServicesSection({
  enka: enkaInitial,
}: {
  enka: boolean;
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");
  const [enka, setEnka] = useState<boolean>();
  const [debug] = shared.state("debug");

  useEffect(() => {
    if (typeof enka !== "boolean") return setEnka(enkaInitial);
    toggleEnka(enka);
  }, [enka, enkaInitial]);

  async function sync() {
    setSyncing(true);
    syncAmber()
      .then(setSyncResult)
      .finally(() => setSyncing(false));
  }

  return (
    <Section title="บริการนอก">
      <div className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <Switch checked={enka} onCheckedChange={setEnka} />
          เปิดใช้การดึงตัวละครใน Artifact
        </div>
        <Button disabled={syncing} onClick={sync} className="w-min">
          {syncing ? <Spinner /> : <FolderSync />}
          Sync Amber
        </Button>
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
