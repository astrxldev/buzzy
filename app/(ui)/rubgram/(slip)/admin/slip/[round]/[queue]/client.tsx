"use client";

import { Database, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/app/(ui)/artifact/admin/[id]/client";
import { Button } from "@/components/ui/button";

export function DataViewer({
  entryYaml,
  slipYaml,
}: {
  entryYaml: string;
  slipYaml: string;
}) {
  const [isSlip, setIsSlip] = useState(false);

  const yaml = useMemo(
    () => (isSlip ? slipYaml : entryYaml),
    [entryYaml, isSlip, slipYaml],
  );

  return (
    <div className="relative max-h-[60svh] overflow-auto rounded-xl border bg-black/40 p-4 font-mono text-xs leading-relaxed">
      <div className="sticky -top-2 -mt-10 -mr-2 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSlip((x) => !x)}
        >
          {isSlip ? <ReceiptText /> : <Database />}
        </Button>
        <CopyButton text={yaml} />
      </div>

      <pre className="wrap-break-word whitespace-pre-wrap">{yaml}</pre>
    </div>
  );
}
