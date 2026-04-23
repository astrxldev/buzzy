/** biome-ignore-all lint/a11y/noStaticElementInteractions: i dont know */
"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  CopyPlus,
  FileQuestionMark,
  Home,
  Pencil,
  Settings,
  Settings2,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import {
  Fragment,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";
import Qiqi from "#/assets/qiqi.webp";
import BadgeSP from "#/assets/sp.webp";
import BadgeSSS from "#/assets/sss.webp";
import { Blocker } from "@/components/blocker";
import { ComboBox } from "@/components/combobox";
import Image from "@/components/image";
import { SimpleTooltip } from "@/components/tooltip";
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
import { authClient } from "@/lib/auth-client";
import { shared } from "@/lib/comms";
import type {
  characters,
  tierlistBadges,
  tierlistColumns,
  tierlistStates,
  tierlistTiers,
  tierlistTypes,
  tierlistVersions,
} from "@/lib/db/schema";
import { tlSse } from "@/lib/db/sse-endpoints";
import { cn } from "@/lib/utils";
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
  const [deleteMode, setDeleteMode] = shared.state("tl.deleteMode");
  const [states, setStates] = useState<(typeof tierlistStates.$inferSelect)[]>(
    [],
  );
  const [_evStatus, setEvStatus] = useState<{
    upload: boolean;
    download: boolean;
    ev: "unknown" | "connecting" | "ready";
  }>({ upload: false, download: false, ev: "unknown" });
  const [_updated] = shared.state("updated");

  const session = authClient.useSession();
  const user = session.data?.user;

  // //#region error handling
  // useEffect(() => {
  //   const handler = (ev: ErrorEvent) =>
  //     toast.error("Unexpected Error Occured", {
  //       description: `${ev?.error?.message || ev?.error || "*unknown error*"}`,
  //     });
  //   const promiseHandler = (ev: PromiseRejectionEvent) =>
  //     toast.error("Unexpected Error Occured", {
  //       description: `${ev.reason || ev || "*unknown error*"}`,
  //     });
  //   window.addEventListener("error", handler);
  //   window.addEventListener("unhandledrejection", promiseHandler);
  //   return () => window.removeEventListener("error", handler);
  // });
  // //#endregion

  //#region states fetching
  const fetchStates = useCallback(async () => {
    setEvStatus((x) => ({ ...x, download: true }));
    setStates(
      await fetch(`/api/tl/${version.id}/states`)
        .then((r) => r.json())
        .finally(() => setEvStatus((x) => ({ ...x, download: false }))),
    );
  }, [version.id]);
  // Reload after connection restored
  shared.signal("sync", fetchStates);
  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  useEffect(() => {
    setEvStatus((x) => ({ ...x, ev: "connecting" }));
    return tlSse(version.id).subMany(
      {
        update_states: setStates,
        update_placements: setPlacements,
      },
      {
        onopen: () => setEvStatus((x) => ({ ...x, ev: "ready" })),
        onerror: () => setEvStatus((x) => ({ ...x, ev: "unknown" })),
      },
    ).clean;
  }, [version.id]);
  //#endregion

  const colRef = useRef<HTMLDivElement | null>(null);
  const untieredRef = useRef<HTMLDivElement | null>(null);

  //#region tileSize calculation
  useLayoutEffect(() => {
    let frame = 0;

    function recalc() {
      if (!colRef.current || !untieredRef.current) return;

      let auto = 0;
      let tiles = Math.ceil(24 / columns.length);

      const colRect = colRef.current.getBoundingClientRect();
      const untieredRect = untieredRef.current.getBoundingClientRect();

      const colPaddingLeft = 4;
      const contPaddingLeft = 4;
      const tilePaddingRight = 8;

      do {
        const tileSizeCol =
          (colRect.width - colPaddingLeft) / tiles - tilePaddingRight;

        let x = Math.floor(
          (untieredRect.width - contPaddingLeft) /
            (tileSizeCol + tilePaddingRight),
        );
        if (x < 1) x = 1;

        const tileSizeUntiered =
          (untieredRect.width - contPaddingLeft) / x - tilePaddingRight;

        auto = Math.min(tileSizeCol, tileSizeUntiered);
        tiles--;
      } while (auto < 60 && tiles > 0);

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setTileSizeAuto((prev) => (prev !== auto ? auto : prev));
      });
    }

    const observer = new ResizeObserver(() => {
      recalc();
    });

    const col = colRef.current;
    const untiered = untieredRef.current;

    if (col) observer.observe(col);
    if (untiered) observer.observe(untiered);

    recalc();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [columns.length]);
  //#endregion tileSize

  //#region placements
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
    const targetId = over.id as string;

    // Find source cell
    let sourceCell: string | undefined;
    for (const cell in placements) {
      if (placements[cell].includes(charId)) {
        sourceCell = cell;
        break;
      }
    }
    if (!sourceCell) return;

    let newPlacements = { ...placements };

    if (chars.some((ch) => ch.id === targetId.split("#")[0])) {
      // Check if dropped on another character (sorting within same cell)
      // Find target cell
      let targetCell: string | undefined;
      for (const cell in placements) {
        if (placements[cell].includes(targetId)) {
          targetCell = cell;
          break;
        }
      }
      if (!targetCell) return;

      if (sourceCell === targetCell) {
        // Reorder within same cell
        const items = [...placements[sourceCell]];
        const oldIndex = items.indexOf(charId);
        const newIndex = items.indexOf(targetId);

        newPlacements[sourceCell] = arrayMove(items, oldIndex, newIndex);
      } else {
        // Move to different cell - INSERT AT HOVERED POSITION
        const targetItems = [...placements[targetCell]];
        const insertIndex = targetItems.indexOf(targetId);

        newPlacements = {
          ...newPlacements,
          [sourceCell]: placements[sourceCell].filter((id) => id !== charId),
          [targetCell]: [
            ...targetItems.slice(0, insertIndex),
            charId,
            ...targetItems.slice(insertIndex),
          ],
        };
      }
    } else {
      // Dropped on a cell (not on a character)
      const targetCell = targetId;
      if (sourceCell !== targetCell) {
        newPlacements = {
          ...newPlacements,
          [sourceCell]: placements[sourceCell].filter((id) => id !== charId),
          [targetCell]: [...placements[targetCell], charId],
        };
      }
    }

    setPlacements(newPlacements);
    posthog.capture("tierlist_character_placed", {
      character_id: charId.split("#")[0],
      target_cell: typeof over.id === "string" ? over.id : undefined,
      tierlist_version: version.id,
      tierlist_type: type.id,
    });
    setEvStatus((x) => ({ ...x, upload: true }));
    tlPlacements(version.id, newPlacements)
      .catch((e) => toast.error(`Sync ล้มเหลว: ${e.message || e}`))
      .finally(() => setEvStatus((x) => ({ ...x, upload: false })));
  }
  //#endregion placements

  //#region ui states
  const [disclaimer, showDisclaimer] = useState(true);
  //#endregion ui

  return (
    <TierListContext.Provider
      value={{
        badges,
        chars,
        tileSize,
        badgeSize,
        editable,
        deleteMode: !!deleteMode,
        async setState(ref, data) {
          const newEntry = {
            ...states.find((e) => e.ref === ref),
            ...(Object.fromEntries(
              Object.entries(data).filter(([_, v]) => v !== undefined),
            ) as typeof tierlistStates.$inferSelect),
            list: version.id,
            char: ref.split("#")[0],
            ref,
          };
          setStates((s) => [...s.filter((e) => e.ref !== ref), newEntry]);
          tlState(newEntry).catch((e) =>
            toast.error(`Sync ล้มเหลว: ${e.message || e}`),
          );
        },
        async removeChar(cid: string) {
          setPlacements((s) =>
            Object.fromEntries(
              Object.entries(s).map(([k, v]) => [
                k,
                v.filter((id) => id !== cid),
              ]),
            ),
          );
        },
      }}
    >
      <DndContext
        onDragStart={(e) => setDragging(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col justify-between h-full">
          {/*}<Blocker inner className="not-portrait:hidden md:hidden">
            <div className="flex flex-col items-center font-bold text-2xl gap-16">
              <Smartphone size={128} className="animate-phonerotate" />
              โปรดปรับจอเป็นแนวนอน
            </div>
          </Blocker>*/}
          {version.disclaimer && disclaimer ? (
            <Blocker inner className=" not-portrait:block md:block">
              <Image
                src={`/cdn/${version.disclaimer}`}
                alt="Disclaimer"
                fill
                priority
                className="object-contain bg-[#000A]"
              />
              <Button
                variant="outline"
                className="absolute top-0 right-0 m-2"
                size="icon"
                onClick={() => showDisclaimer(false)}
                aria-label="Close Disclaimer"
              >
                <X />
              </Button>
            </Blocker>
          ) : (
            ""
          )}
          <div className="flex-1 min-h-0 overflow-auto">
            <div
              className={`grid w-full *:border`}
              style={{
                gridTemplateColumns: `min-content repeat(${columns.length}, 1fr)`,
                gridTemplateRows: `min-content min-content repeat(${tiers.length}, minmax(0, min-content))`,
              }}
            >
              <div
                className={cn(
                  "text-center font-semibold py-1 relative transition-colors duration-200",
                  deleteMode ? "bg-red-500/30" : "bg-[#0005]",
                )}
                style={{ gridColumn: "1 / -1" }}
              >
                <span>
                  {type.name} เวอร์ชั่น {version.name} ระดับ
                  <span className="text-yellow-400">{type.mode}</span> ใช้ได้ถึง{" "}
                </span>
                <span className="text-green-400">{version.deprecates}</span>
                {deleteMode && (
                  <span className="text-red-500 font-semibold ml-2">
                    <TriangleAlert className="inline" /> (คุณอยู่ในโหมดลบตัวละคร)
                  </span>
                )}
                <span className="font-normal absolute right-0">
                  {user && !editable && (
                    <SimpleTooltip text="ไปหน้าแก้ไข (Admin)">
                      <Link href={`/tl/${type.id}/${version.id}/admin`}>
                        <Pencil className="text-gray-400 size-4" />
                      </Link>
                    </SimpleTooltip>
                  )}
                </span>
              </div>
              <div className="grid place-items-center bg-[#2225] cursor-pointer">
                <Dialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Settings className="size-8" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <Link href="/tl">
                        <DropdownMenuItem>
                          {" "}
                          <Home className="size-4" />
                          หน้าหลัก
                        </DropdownMenuItem>
                      </Link>
                      {user && !editable && (
                        <DropdownMenuItem asChild>
                          <Link href={`/tl/${type.id}/${version.id}/admin`}>
                            <Pencil className="size-4" />
                            ไปหน้าแก้ไข
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DialogTrigger asChild>
                        <DropdownMenuItem>
                          {" "}
                          <Settings2 className="size-4" />
                          การตั้งค่า
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DropdownMenuItem onClick={() => showDisclaimer(true)}>
                        <FileQuestionMark className="size-4" />
                        แสดงเงื่อนไข
                      </DropdownMenuItem>
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
                              value={
                                tileSizeSetting || Math.round(tileSizeAuto)
                              }
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
                          <Image src={Qiqi} alt="Qiqi" fill />
                          <Image
                            className="bg-[#2225] backdrop-blur-sm bottom-0.5 left-0.5 absolute rounded border"
                            src={BadgeSSS}
                            alt="Test Badge"
                            width={badgeSize}
                            height={badgeSize}
                          />
                          <Image
                            className="bg-[#2225] backdrop-blur-sm bottom-0.5 right-0.5 absolute border rounded"
                            src={BadgeSP}
                            alt="Test Badge"
                            width={badgeSize}
                            height={badgeSize}
                          />
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

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
                      width={200}
                      height={100}
                      className="p-2 object-contain w-full h-auto max-h-13"
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
                        className="object-contain max-w-12"
                        sizes="4"
                      />
                    ) : (
                      t.name
                    )}
                  </div>
                  {columns.map((c) => {
                    const cellId = `${t.id}-${c.id}`;
                    const cellChars = placements[cellId]
                      .map((id) => [
                        id,
                        chars.find((ch) => ch.id === id.split("#")[0]),
                      ])
                      .filter(
                        (x): x is [string, typeof characters.$inferSelect] =>
                          !!x[1],
                      );
                    return (
                      <TierListCell
                        key={cellId}
                        column={c}
                        tier={t}
                        items={placements[cellId]}
                      >
                        {cellChars.map(([id, ch]) => (
                          <Draggable
                            key={id}
                            cid={id}
                            char={ch}
                            tier={t.id}
                            state={states.find((s) => s.ref === id)}
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
              className="rounded-none flex"
            >
              {editable && untieredOpen && <div className="w-9 h-4" />}
              <span className="w-full flex gap-1 items-center justify-center">
                ({placements.untiered.length}) ตัวละครที่ไม่ได้อยู่ในเทียร์
                {untieredOpen ? (
                  <ChevronDown className="ml-1" />
                ) : (
                  <ChevronUp className="ml-1" />
                )}
              </span>
              {editable && untieredOpen && (
                <div
                  className="flex gap-2 items-center justify-center"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <SimpleTooltip text="เพิ่มตัวละคร">
                    <span>
                      <ComboBox
                        placeholder="ค้นหาตัวละคร"
                        id="character"
                        name="character"
                        data={chars
                          .map((c) => ({ label: c.name, value: c.id }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        className="w-full bg-transparent! hover:bg-accent!"
                        trigger={
                          <CopyPlus className="text-emerald-400 pointer-events-auto!" />
                        }
                        onValueSelect={(v) => {
                          setPlacements((x) => ({
                            ...x,
                            untiered: [`${v}#${Date.now()}`, ...x.untiered],
                          }));
                          toast.success(`เพิ่ม ${v} เข้าเทียร์ลิสต์แล้ว`);
                        }}
                      />
                    </span>
                  </SimpleTooltip>
                  <SimpleTooltip
                    text={
                      deleteMode ? "คลิกอีกครั้งเพื่อออกจากโหมดลบ" : "ลบตัวละครออก"
                    }
                  >
                    <Trash2
                      className={cn(
                        "pointer-events-auto! text-red-500",
                        deleteMode && "animate-pulse",
                      )}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setDeleteMode((x) => !x);
                      }}
                    />
                  </SimpleTooltip>
                </div>
              )}
            </Button>
            <SortableContext
              items={placements.untiered}
              strategy={rectSortingStrategy}
            >
              <Untiered ref={untieredRef} open={untieredOpen}>
                {untieredOpen &&
                  placements.untiered
                    .map((id) => {
                      const cid = id.split("#")[0];
                      const ch = chars.find((c) => c.id === cid);
                      if (!ch) return null;
                      return <Draggable key={id} cid={id} char={ch} />;
                    })
                    .filter(Boolean)}
              </Untiered>
            </SortableContext>
          </div>
        </div>
        <DragOverlay>
          {dragging && (
            <Draggable
              char={chars.find((c) => c.id === dragging.split("#")[0])!}
              cid={dragging}
            />
          )}
        </DragOverlay>
      </DndContext>
    </TierListContext.Provider>
  );
}

function arrayMove<T>(arr: T[], oldIndex: number, newIndex: number): T[] {
  return arr.toSpliced(oldIndex, 1).toSpliced(newIndex, 0, arr[oldIndex]);
}
