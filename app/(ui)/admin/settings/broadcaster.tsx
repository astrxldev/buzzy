"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { FakeToast, type ToastType } from "@/components/fake-toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { broadcastMessage } from "./api";
import { ActionButton } from "@/components/action-button";

const toastTypes: ToastType[] = ["warning", "error", "success", "info"];

export function Broadcaster() {
  const [expanded, setExpanded] = useState(false);
  const [prefix, setPrefix] = useState("/");
  const [prefixFocused, setPrefixFocused] = useState(false);
  const [value, setValue] = useState("");
  const [type, setType] = useState<ToastType>("warning");

  function cycleType() {
    setType((currentType) => {
      const currentIndex = toastTypes.indexOf(currentType);
      return toastTypes[(currentIndex + 1) % toastTypes.length];
    });
  }

  return (
    <div
      className={cn(
        "relative w-fit rounded-lg border border-zinc-800 bg-[#050505] bg-[radial-gradient(#3f3f46_1px,transparent_1px)] bg-size-[16px_16px] p-0 transition-[padding] duration-300",
        expanded && "p-12",
      )}
    >
      <FakeToast type={type} onIconClick={cycleType}>
        <span
          onClick={() => setExpanded(true)}
          onBlur={(ev) => setValue(ev.target.textContent)}
          contentEditable
          data-placeholder="Broadcast message..."
          className="w-full flex-1"
        ></span>
      </FakeToast>
      <div
        className={cn(
          "absolute right-1 bottom-1 flex w-0 gap-1 opacity-0 transition-opacity duration-300",
          expanded && "w-fit opacity-100 delay-300",
        )}
      >
        <Input
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          onFocus={() => setPrefixFocused(true)}
          onBlur={() => setPrefixFocused(false)}
          className="backdrop-blur-xs transition-[width] focus:w-48"
          style={{
            width: prefixFocused
              ? undefined
              : `calc(24px + ${Math.max(prefix.length, 1)}ch)`,
          }}
        />
        <ActionButton
          size="icon"
          variant="outline"
          className="backdrop-blur-xs"
          action={async () => {
            await broadcastMessage(prefix, value, type);
            setExpanded(false);
          }}
        >
          <Send />
        </ActionButton>
      </div>
    </div>
  );
}
