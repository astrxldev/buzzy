"use client";

import { useEffect, useState } from "react";
import { SimpleTooltip } from "./tooltip";

export function DiscordMentionable({
  name,
  id,
  type,
}: {
  name: string;
  id: string;
  type: "role" | "user" | "channel";
}) {
  const [copied, setCopied] = useState(0);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(0), 5000);
    return () => clearTimeout(timeout);
  }, [copied]);
  return (
    <SimpleTooltip
      text={
        copied === 1
          ? "Copied!"
          : copied === 2
            ? "Couldn't copy..."
            : `Click to copy ${type} mention`
      }
    >
      <button
        type="button"
        onClick={() => {
          try {
            switch (type) {
              case "user":
                navigator.clipboard.writeText(`<@${id}>`);
                break;
              case "role":
                navigator.clipboard.writeText(`<@&${id}>`);
                break;
              case "channel":
                navigator.clipboard.writeText(`<#${id}>`);
                break;
            }
            setCopied(1);
          } catch (e) {
            console.error(e);
            setCopied(2);
          }
        }}
        className="cursor-pointer rounded-[3px] bg-mention-background px-0.5 font-medium text-mention-foreground transition-[background-color,color] duration-50 ease-out hover:bg-mention-hover hover:text-white"
      >
        {type === "channel" ? "#" : "@"}
        {name}
      </button>
    </SimpleTooltip>
  );
}
