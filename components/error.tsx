"use client";

import type { ErrorInfo } from "next/dist/client/components/error-boundary";
import { ModalBase } from "./modal";
import { Button } from "./ui/button";
import { DialogClose, DialogFooter } from "./ui/dialog";

export function ErrorModal({
  error,
  reset,
}: Omit<ErrorInfo, "unstable_retry">) {
  return (
    <ModalBase title="Modal Error">
      An error occured while spawning modal:
      <pre className="whitespace-pre-wrap break-all">
        {error.stack?.split("\n").slice(0, 2).join("\n")}
      </pre>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
        <Button variant="destructive" onClick={reset}>
          Retry
        </Button>
      </DialogFooter>
    </ModalBase>
  );
}
