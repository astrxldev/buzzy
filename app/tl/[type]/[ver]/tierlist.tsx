"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  TriangleAlert,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Fragment,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";
import Favicon from "#/favicon.webp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { tlPlacements, tlState } from "@/lib/api";
import type {
  characters,
  tierlistBadges,
  tierlistColumns,
  tierlistStates,
  tierlistTiers,
  tierlistTypes,
  tierlistVersions,
} from "@/lib/db/schema";
import { TierListCell } from "./cell";
import { Draggable } from "./character";
import { TierListContext } from "./context";

function Untiered({
  children,
  ref,
  open,
}: {
  children?: ReactNode;
  ref?: RefObject<HTMLDivElement | null>;
  open?: boolean;
}) {
  const { tileSize } = useContext(TierListContext);
  const { setNodeRef } = useDroppable({
    id: "untiered",
  });
  return (
    <div ref={ref}>
      <div
        ref={setNodeRef}
        className={`flex flex-wrap ${open ? "p-1" : ""} gap-2 bg-[#0005] overflow-auto`}
        style={{
          maxHeight: `${(tileSize + 4) * 3 + 4}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function TierList({
  type,
  version,
  chars,
  tiers,
  columns,
  badges,
  editable = false,
}: {
  type: typeof tierlistTypes.$inferSelect;
  version: typeof tierlistVersions.$inferSelect;
  chars: (typeof characters.$inferSelect)[];
  tiers: (typeof tierlistTiers.$inferSelect)[];
  columns: (typeof tierlistColumns.$inferSelect)[];
  badges: (typeof tierlistBadges.$inferSelect & { tier: string[] })[];
  editable?: boolean;
}) {
  const [tileSizeSetting, setTileSize] = useLocalStorage<number | null>(
    "tl_tileSize",
    null,
  );
  const [badgeSize, setBadgeSize] = useLocalStorage<number>("tl_badgeSize", 24);
  const [tileSizeAuto, setTileSizeAuto] = useState(0);
  const tileSize = tileSizeSetting || tileSizeAuto;
  const [states, setStates] = useState<(typeof tierlistStates.$inferSelect)[]>(
    [],
  );

  //#region error handling
  useEffect(() => {
    const handler = (ev: ErrorEvent) =>
      toast("Unexpected Error Occured", {
        icon: <TriangleAlert className="text-red-400" />,
        description: `${ev.error.message || ev.error || "*unknown error*"}`,
      });
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  });
  //#endregion

  //#region states fetching
  useEffect(() => {
    async function fetchStates() {
      setStates(
        await fetch(`/api/tl/${version.id}/states`).then((r) => r.json()),
      );
    }
    fetchStates();
  }, [version]);

  useEffect(() => {
    const es = new EventSource(`/api/tl/${version.id}/ev`);
    es.addEventListener("update_states", (d) => setStates(JSON.parse(d.data)));
    es.addEventListener("update_placements", (d) =>
      setPlacements(JSON.parse(d.data)),
    );
    es.onerror = () =>
      toast("Live Reload ใช้งานไม่ได้ ลองรีโหลดใหม่", {
        icon: <TriangleAlert className="text-red-400" />,
      });
    return () => es.close();
  }, [version]);
  //#endregion

  const colRef = useRef<HTMLDivElement | null>(null);
  const untieredRef = useRef<HTMLDivElement | null>(null);

  //#region tileSize calculation
  // biome-ignore lint/correctness/useExhaustiveDependencies: falsy
  useLayoutEffect(() => {
    function recalc() {
      let auto = 0;
      let tiles = Math.ceil(24 / columns.length);
      do {
        if (!colRef.current || !untieredRef.current) return;

        const colRect = colRef.current.getBoundingClientRect();
        const untieredRect = untieredRef.current.getBoundingClientRect();

        const colPaddingLeft = 4;
        const contPaddingLeft = 4;
        const tilePaddingRight = 8;

        // tiered
        const tileSizeCol =
          (colRect.width - colPaddingLeft) / tiles - tilePaddingRight;

        // untiered
        let x = Math.floor(
          (untieredRect.width - contPaddingLeft) /
            (tileSizeCol + tilePaddingRight),
        );
        if (x < 1) x = 1;

        const tileSizeUntiered =
          (untieredRect.width - contPaddingLeft) / x - tilePaddingRight;

        console.log(tileSizeCol, tileSizeUntiered);
        // final auto size
        auto = Math.min(tileSizeCol, tileSizeUntiered);
        tiles--;
      } while (auto < 60 && tiles > 0);
      setTileSizeAuto(auto);
    }

    const observer = new ResizeObserver(recalc);
    if (colRef.current) observer.observe(colRef.current);
    if (untieredRef.current) observer.observe(untieredRef.current);

    // run once immediately
    recalc();

    return () => observer.disconnect();
  }, [columns.length, colRef.current, untieredRef.current]);
  //#endregion tileSize

  const [untieredOpen, setUntieredOpen] = useLocalStorage(
    "tl_untieredOpen",
    true,
  );

  const tiered: (string | undefined)[] = Object.values({
    ...version.placements,
    untiered: undefined,
  }).flat();
  const [placements, setPlacements] = useState<Record<string, string[]>>({
    ...Object.fromEntries(
      tiers.flatMap((t) =>
        columns.map((c) => [`${t.id}-${c.id}`, [] as string[]]),
      ),
    ),
    ...version.placements,
    untiered: chars.map((ch) => ch.id).filter((c) => !tiered.includes(c)),
  });
  const [dragging, setDragging] = useState<string | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    if (!editable) return;
    const { active, over } = event;
    if (!over) return;
    const charId = active.id as string;
    const target = over.id as string;
    let source: string | undefined;
    for (const cell in placements) {
      if (placements[cell].includes(charId)) {
        source = cell;
        break;
      }
    }
    if (!source || source === target) return;
    const newPlacements = {
      ...placements,
      [source]: placements[source].filter((id) => id !== charId),
      [target]: [...placements[target], charId],
    };
    setPlacements(newPlacements);
    tlPlacements(version.id, newPlacements).catch((e) =>
      toast(`Sync ล้มเหลว: ${e.message || e}`, {
        icon: <TriangleAlert className="text-red-400" />,
      }),
    );
  }
  //#endregion placements

  return (
    <TierListContext.Provider
      value={{
        badges,
        chars,
        tileSize,
        badgeSize,
        editable,
        async setState(char, data) {
          const newEntry = {
            ...states.find((e) => e.char === char),
            ...(Object.fromEntries(
              Object.entries(data).filter(([_, v]) => v !== undefined),
            ) as typeof tierlistStates.$inferSelect),
            list: version.id,
            char,
          };
          setStates((s) => [...s.filter((e) => e.char !== char), newEntry]);
          tlState(newEntry).catch((e) =>
            toast(`Sync ล้มเหลว: ${e.message || e}`, {
              icon: <TriangleAlert className="text-red-400" />,
            }),
          );
        },
      }}
    >
      <DndContext
        onDragStart={(e) => setDragging(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="flex-1 min-h-0 overflow-auto">
            <div
              className={`grid w-full [&>*]:border`}
              style={{
                gridTemplateColumns: `min-content repeat(${columns.length}, 1fr)`,
                gridTemplateRows: `min-content repeat(${tiers.length}, minmax(0, min-content))`,
              }}
            >
              <Dialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex flex-col font-bold items-center justify-center aspect-square w-min h-min whitespace-nowrap bg-[#2225] cursor-pointer">
                      <span>{type.name}</span>
                      <span>{version.name}</span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <Link href="/tl">
                      <DropdownMenuItem>หน้าหลัก</DropdownMenuItem>
                    </Link>
                    <DialogTrigger asChild>
                      <DropdownMenuItem>การตั้งค่า</DropdownMenuItem>
                    </DialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>การตั้งค่า</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="grid gap-2 group">
                        <span className="flex gap-1">
                          ขนาดตัวละคร{" "}
                          <span className="flex gap-1 text-muted-foreground md:opacity-0 group-hover:opacity-100 transition-opacity">
                            (px){" "}
                            {tileSizeSetting ? (
                              ""
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Calculator className="text-emerald-400" />
                                </TooltipTrigger>
                                <TooltipContent>คำนวณอัตโนมัติ</TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        </span>
                        <div className="flex gap-1">
                          <Input
                            value={tileSizeSetting || Math.round(tileSizeAuto)}
                            onChange={(ev) =>
                              setTileSize(Number(ev.target.value))
                            }
                            type="number"
                          />
                          <Button
                            onClick={() =>
                              setTileSize((x) => (x || tileSize) + 1)
                            }
                            variant="outline"
                            size="icon"
                          >
                            <ChevronUp />
                          </Button>
                          <Button
                            onClick={() =>
                              setTileSize((x) => (x || tileSize) - 1)
                            }
                            variant="outline"
                            size="icon"
                          >
                            <ChevronDown />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2 group">
                        <span>
                          ขนาดเครื่องหมาย{" "}
                          <span className="text-muted-foreground md:opacity-0 group-hover:opacity-100 transition-opacity">
                            (px)
                          </span>
                        </span>
                        <div className="flex gap-1">
                          <Input
                            value={badgeSize}
                            onChange={(ev) =>
                              setBadgeSize(Number(ev.target.value))
                            }
                            type="number"
                          />
                          <Button
                            onClick={() =>
                              setBadgeSize((x) => (x || tileSize) + 1)
                            }
                            variant="outline"
                            size="icon"
                          >
                            <ChevronUp />
                          </Button>
                          <Button
                            onClick={() =>
                              setBadgeSize((x) => (x || tileSize) - 1)
                            }
                            variant="outline"
                            size="icon"
                          >
                            <ChevronDown />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          background:
                            "rgba(200,124,36) linear-gradient(136deg,rgba(49,43,71,.5294117647058824),transparent)",
                          width: tileSize,
                        }}
                        className="rounded aspect-square relative"
                      >
                        <Image
                          className="absolute bottom-0.5 left-0.5 border rounded"
                          src={Favicon}
                          alt="Test Badge"
                          width={badgeSize}
                          height={badgeSize}
                        />
                        <Image
                          className="absolute bottom-0.5 right-0.5 border rounded"
                          src={Favicon}
                          alt="Test Badge"
                          width={badgeSize}
                          height={badgeSize}
                        />
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {columns.map((c) => (
                <div
                  key={`C${c.id}`}
                  className="bg-[#0005] text-2xl font-bold flex items-center justify-center relative"
                  ref={colRef}
                >
                  {c.image ? (
                    <Image
                      src={`/cdn/${c.image}`}
                      alt={c.name}
                      fill
                      className="p-2 object-cover"
                    />
                  ) : (
                    c.name
                  )}
                </div>
              ))}
              {tiers.map((t) => (
                <Fragment key={`T${t.id}`}>
                  <div className="bg-[#0005] text-4xl font-bold flex items-center justify-center">
                    {t.image ? (
                      <Image
                        src={`/cdn/${t.image}`}
                        alt={t.name}
                        height={100}
                        width={100}
                      />
                    ) : (
                      t.name
                    )}
                  </div>
                  {columns.map((c) => {
                    const cellId = `${t.id}-${c.id}`;
                    const cellChars = placements[cellId].map(
                      (id) => chars.find((ch) => ch.id === id)!,
                    );
                    return (
                      <TierListCell key={cellId} column={c} tier={t}>
                        {cellChars.map((ch) => (
                          <Draggable
                            key={ch.id}
                            char={ch}
                            tier={t.id}
                            state={states.find((s) => s.char === ch.id)}
                          />
                        ))}
                      </TierListCell>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <Button
              onClick={() => setUntieredOpen(!untieredOpen)}
              variant="outline"
              className="rounded-none"
            >
              ({placements.untiered.length}) ตัวละครที่ยังไม่ได้จัดเทียร์
              {untieredOpen ? (
                <ChevronDown className="ml-1" />
              ) : (
                <ChevronUp className="ml-1" />
              )}
            </Button>
            <Untiered ref={untieredRef} open={untieredOpen}>
              {untieredOpen &&
                placements.untiered.map((id) => {
                  const ch = chars.find((c) => c.id === id)!;
                  return (
                    <Draggable
                      key={ch.id}
                      char={ch}
                      state={states.find((s) => s.char === ch.id)}
                    />
                  );
                })}
            </Untiered>
          </div>
        </div>
        <DragOverlay>
          {dragging && (
            <Draggable char={chars.find((c) => c.id === dragging)!} />
          )}
        </DragOverlay>
      </DndContext>
    </TierListContext.Provider>
  );
}
