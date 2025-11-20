"use client";

import { FolderSync } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
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
      <div className="flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <Switch checked={enka} onCheckedChange={setEnka} />
          เปิดใช้การดึงตัวละครใน Artifact
        </div>
        <Button disabled={syncing} onClick={sync} className="w-min">
          {syncing ? <Spinner /> : <FolderSync />}
          Sync Amber
        </Button>
        {syncResult && (
          <pre className="border bg-muted rounded h-full p-2">{syncResult}</pre>
        )}
      </div>
    </Section>
  );
}
