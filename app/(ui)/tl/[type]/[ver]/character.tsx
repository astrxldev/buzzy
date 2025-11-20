"use client";

import Image from "next/image";
import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import AmberIcon from "#/amber.png";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { characters, tierlistStates } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { SortableDraggable } from "./cell";
import { TierListContext } from "./context";

export function Draggable({
  char,
  state,
  tier,
}: {
  char: typeof characters.$inferSelect;
  state?: typeof tierlistStates.$inferInsert;
  tier?: string;
}) {
  const { tileSize, badgeSize, badges, setState, editable } =
    useContext(TierListContext);

  const [panelOpen, setPanelOpen] = useState(false);

  const [comment, setComment] = useState("");
  const [assignedBadges, setBadges] = useState<string[]>([]);
  const [dirty, setDirty] = useState(0);

  useEffect(() => {
    if (dirty) return;
    setComment(state?.comment || "");
    setBadges(state?.badges || []);
  }, [dirty, state]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!dirty) return;
      setDirty(0);
      setState(char.id, { comment, badges: assignedBadges });
    }, dirty);
    return () => clearTimeout(timeout);
  }, [dirty, comment, setState, char, assignedBadges]);

  function toggleBadge(badge: string) {
    setDirty(200);
    setBadges(
      assignedBadges.includes(badge)
        ? assignedBadges.filter((b) => b !== badge)
        : [...assignedBadges, badge],
    );
  }

  return (
    <SortableDraggable id={char.id}>
      {({ listeners, attributes, setNodeRef, style }) => (
        <Popover open={panelOpen} onOpenChange={setPanelOpen}>
          <PopoverTrigger asChild>
            <button
              ref={setNodeRef}
              style={style}
              suppressHydrationWarning
              {...listeners}
              {...attributes}
              onContextMenu={(ev) => {
                ev.preventDefault();
                setPanelOpen((x) => !x);
              }}
            >
              <div className="relative">
                <SimpleTooltip text={char.name} delayDuration={1000}>
                  <Image
                    src={`/cdn/${char.image}`}
                    style={{
                      background: `rgba(${
                        char.stars === 5
                          ? "200,124,36"
                          : char.stars === 4
                            ? "148,112,187"
                            : "100,100,100"
                      }) linear-gradient(136deg,rgba(49,43,71,.5294117647058824),transparent)`,
                    }}
                    className="rounded hover:brightness-110"
                    alt={char.name}
                    height={tileSize}
                    width={tileSize}
                  />
                </SimpleTooltip>
                {[
                  "bottom-0.5 right-0.5",
                  "bottom-0.5 left-0.5",
                  "top-0.5 right-0.5",
                  "top-0.5 left-0.5",
                ].map((p, i) => {
                  if (!assignedBadges[i]) return "";
                  const badge = badges.find((e) => e.id === assignedBadges[i]);
                  if (!badge) return "";
                  return badge.image ? (
                    <Image
                      key={p}
                      src={`/cdn/${badge.image}`}
                      className={`bg-[#2228] ${p} absolute rounded border`}
                      alt="badge"
                      width={badgeSize}
                      height={badgeSize}
                    />
                  ) : (
                    <div
                      key={p}
                      style={{ width: badgeSize, height: badgeSize }}
                      className={`bg-[#2228] ${p} absolute rounded border font-bold`}
                    >
                      {badge.name}
                    </div>
                  );
                })}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            className="bg-[#2225] backdrop-blur-md p-1"
          >
            <div className="flex gap-2">
              {editable && (
                <div className="flex flex-col justify-between shrink-0 gap-2">
                  <div className="grid grid-cols-2 gap-1 h-min items-stretch">
                    {badges
                      .filter(
                        (b) =>
                          assignedBadges.includes(b.id) ||
                          !b.tier.length ||
                          !tier ||
                          b.tier.includes(tier),
                      )
                      .map((e) =>
                        e.image ? (
                          <Image
                            src={`/cdn/${e.image}`}
                            alt={e.name}
                            key={`B${e.id}`}
                            width={32}
                            height={32}
                            className={cn(
                              "border rounded hover:brightness-110 hover:backdrop-brightness-300 cursor-pointer",
                              assignedBadges.includes(e.id) &&
                                "backdrop-brightness-500",
                            )}
                            onClick={() => toggleBadge(e.id)}
                          />
                        ) : (
                          <button
                            key={`B${e.id}`}
                            className={cn(
                              "border rounded hover:brightness-110 hover:backdrop-brightness-300 flex justify-center items-center font-bold cursor-pointer min-w-8 min-h-8",
                              assignedBadges.includes(e.id) &&
                                "backdrop-brightness-500",
                            )}
                            onClick={() => toggleBadge(e.id)}
                            type="button"
                          >
                            {e.name}
                          </button>
                        ),
                      )}
                  </div>
                  <Link
                    href={`https://gi.yatta.moe/en/archive/avatar/${char.amber}/${char.name.replace(/ /g, "-").toLowerCase()}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Button variant="outline" className="p-1 w-full">
                      <Image
                        src={AmberIcon}
                        alt="Amber"
                        width={16}
                        height={16}
                      />
                      <div className="flex flex-col items-start">
                        <span className="text-[8px]">เปิดใน</span>
                        <span className="text-[10px]">Amber</span>
                      </div>
                    </Button>
                  </Link>
                </div>
              )}
              <Textarea
                placeholder="Comment..."
                className="aspect-square bg-card resize-none disabled:opacity-90"
                value={comment}
                onChange={(ev) => {
                  setDirty(500);
                  setComment(ev.target.value);
                }}
                disabled={!editable}
              />
            </div>
          </PopoverContent>
        </Popover>
      )}
    </SortableDraggable>
  );
}
