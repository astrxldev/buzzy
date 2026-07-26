<script lang="ts">
  import {
    ChevronDown,
    ChevronUp,
    Calculator,
    CopyPlus,
    FileQuestionMark,
    Home,
    MessageSquareText,
    Pencil,
    Settings,
    Trash2,
    TriangleAlert,
    X,
  } from "lucide-svelte";
  import { tick } from "svelte";
  import ReconnectingEventSource from "reconnecting-eventsource";
  import { invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { dndzone } from "svelte-dnd-action";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import { cn } from "$lib/utils";
  import {
    savePlacements as savePlacementsRemote,
    saveState as saveStateRemote,
  } from "../../../routes/tl/tierlist.remote";
  import type {
    characters,
    tierlistBadges,
    tierlistColumns,
    tierlistStates,
    tierlistTiers,
    tierlistTypes,
    tierlistVersions,
  } from "@/lib/db/schema";

  type Char = typeof characters.$inferSelect;
  type Tier = typeof tierlistTiers.$inferSelect;
  type Column = typeof tierlistColumns.$inferSelect;
  type State = typeof tierlistStates.$inferSelect;
  type Badge = typeof tierlistBadges.$inferSelect & { tier: string[] };
  type DndItem = { id: string };
  type DndEvent = CustomEvent<{ items: DndItem[] }>;

  let {
    type,
    version,
    chars,
    tiers,
    columns,
    badges,
    states: initialStates,
    editable = false,
    canEdit = editable,
  }: {
    type: typeof tierlistTypes.$inferSelect;
    version: typeof tierlistVersions.$inferSelect;
    chars: Char[];
    tiers: Tier[];
    columns: Column[];
    badges: Badge[];
    states: State[];
    editable?: boolean;
    canEdit?: boolean;
  } = $props();

  const cellIds = $derived([
    ...tiers.flatMap((tier) =>
      columns.map((column) => `${tier.id}-${column.id}`),
    ),
    "untiered",
  ]);

  function makeInitialPlacements() {
    const tiered = Object.values(version.placements ?? {}).flat();
    return {
      ...Object.fromEntries(
        tiers.flatMap((tier) =>
          columns.map((column) => [`${tier.id}-${column.id}`, [] as string[]]),
        ),
      ),
      ...(version.placements ?? {}),
      untiered: chars.map((char) => char.id).filter((id) => !tiered.includes(id)),
    };
  }

  function makeInitialStates() {
    return initialStates;
  }

  let placements = $state<Record<string, string[]>>(makeInitialPlacements());
  let states = $state<State[]>(makeInitialStates());
  let untieredOpen = $state(true);
  let tileSizeSetting = $state<number | null>(null);
  let tileSizeAuto = $state(72);
  const tileSize = $derived(tileSizeSetting || tileSizeAuto);
  let badgeSize = $state(24);
  let settingsOpen = $state(false);
  let disclaimerOpen = $state(false);
  let newCharacter = $state("");
  let deleteMode = $state(false);
  let selectedRef = $state<string | null>(null);
  let selectedComment = $state("");
  let selectedBadges = $state<string[]>([]);
  let status = $state<"idle" | "saving" | "saved" | "error">("idle");
  let connection = $state<"unknown" | "connecting" | "ready">("unknown");
  let preferencesLoaded = $state(false);
  let columnElement = $state<HTMLElement>();
  let untieredElement = $state<HTMLElement>();
  let stateSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let savedStatusTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    version.id;
    version.placements;
    version.disclaimer;
    chars;
    tiers;
    columns;
    initialStates;

    clearTimeout(stateSaveTimer);
    clearTimeout(savedStatusTimer);
    stateSaveTimer = undefined;
    savedStatusTimer = undefined;
    placements = makeInitialPlacements();
    states = makeInitialStates();
    selectedRef = null;
    selectedComment = "";
    selectedBadges = [];
    status = "idle";
    settingsOpen = false;
    disclaimerOpen = !!version.disclaimer;
    deleteMode = false;
  });

  $effect(() => {
    if (!newCharacter) return;
    addCharacter(newCharacter);
    newCharacter = "";
  });

  $effect(() => {
    const readPreference = <T,>(key: string, fallback: T): T => {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : (JSON.parse(value) as T);
      } catch {
        return fallback;
      }
    };
    tileSizeSetting = readPreference<number | null>("tl_tileSize", null);
    badgeSize = readPreference("tl_badgeSize", 24);
    untieredOpen = readPreference("tl_untieredOpen", true);
    preferencesLoaded = true;
  });

  $effect(() => {
    if (!preferencesLoaded) return;
    localStorage.setItem("tl_tileSize", JSON.stringify(tileSizeSetting));
    localStorage.setItem("tl_badgeSize", JSON.stringify(badgeSize));
    localStorage.setItem("tl_untieredOpen", JSON.stringify(untieredOpen));
  });

  $effect(() => {
    if (!columnElement || !untieredElement) return;
    let frame = 0;
    const recalculate = () => {
      const columnWidth = columnElement!.getBoundingClientRect().width;
      const untieredWidth = untieredElement!.getBoundingClientRect().width;
      let auto = 0;
      let tiles = Math.ceil(24 / Math.max(columns.length, 1));
      do {
        const columnSize = (columnWidth - 4) / tiles - 8;
        const across = Math.max(1, Math.floor((untieredWidth - 4) / (columnSize + 8)));
        auto = Math.min(columnSize, (untieredWidth - 4) / across - 8);
        tiles--;
      } while (auto < 60 && tiles > 0);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => (tileSizeAuto = Math.max(40, auto)));
    };
    const observer = new ResizeObserver(recalculate);
    observer.observe(columnElement);
    observer.observe(untieredElement);
    recalculate();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });

  $effect(() => {
    const listId = version.id;
    const source = new ReconnectingEventSource(`/sse/tl.${listId}`);
    connection = "connecting";
    const updateStates = (event: MessageEvent<string>) => {
      if (version.id !== listId) return;
      const next = JSON.parse(event.data) as State[];
      states = next;
      if (selectedRef && !stateSaveTimer) {
        const selected = next.find((state) => state.ref === selectedRef);
        selectedComment = selected?.comment ?? "";
        selectedBadges = selected?.badges ?? [];
      }
    };
    const updatePlacements = (event: MessageEvent<string>) => {
      if (version.id !== listId) return;
      placements = JSON.parse(event.data) as Record<string, string[]>;
    };
    const refetch = async () => {
      if (version.id !== listId) return;
      try {
        await invalidateAll();
      } catch (error) {
        console.error("Tierlist sync failed", error);
      }
    };
    source.addEventListener("update_states", updateStates as EventListener);
    source.addEventListener("update_placements", updatePlacements as EventListener);
    source.onopen = () => {
      if (version.id !== listId) return;
      connection = "ready";
      void refetch();
    };
    source.onerror = () => {
      if (version.id === listId) connection = "unknown";
    };
    return () => {
      source.close();
      clearTimeout(stateSaveTimer);
      clearTimeout(savedStatusTimer);
      stateSaveTimer = undefined;
      savedStatusTimer = undefined;
    };
  });

  const selectedChar = $derived(
    selectedRef ? chars.find((char) => char.id === selectedRef!.split("#")[0]) : undefined,
  );
  const selectedState = $derived(
    selectedRef ? states.find((state) => state.ref === selectedRef) : undefined,
  );

  const selectedTier = $derived.by(() => {
    if (!selectedRef) return undefined;
    return tiers.find((tier) =>
      Object.entries(placements).some(
        ([cell, refs]) => cell.startsWith(`${tier.id}-`) && refs.includes(selectedRef!),
      ),
    )?.id;
  });

  function getChar(ref: string) {
    return chars.find((char) => char.id === ref.split("#")[0]);
  }

  function getState(ref: string) {
    return states.find((state) => state.ref === ref);
  }

  function cellItems(cellId: string): DndItem[] {
    return (placements[cellId] ?? []).map((id) => ({ id }));
  }

  function updateCell(cellId: string, event: DndEvent) {
    if (!editable) return;
    placements = {
      ...placements,
      [cellId]: event.detail.items.map((item) => item.id),
    };
  }

  async function savePlacements(
    listId = version.id,
    nextPlacements = $state.snapshot(placements),
  ) {
    if (!editable || version.id !== listId) return;
    status = "saving";
    try {
      await savePlacementsRemote({ list: listId, placements: nextPlacements });
      if (version.id !== listId) return;
      status = "saved";
    } catch (error) {
      if (version.id !== listId) return;
      console.error(error);
      status = "error";
    }
  }

  async function handleFinalize(cellId: string, event: DndEvent) {
    updateCell(cellId, event);
    const listId = version.id;
    const nextPlacements = $state.snapshot(placements);
    await tick();
    await savePlacements(listId, nextPlacements);
  }

  function addCharacter(charId: string) {
    const ref = `${charId}#${Date.now()}`;
    placements = {
      ...placements,
      untiered: [ref, ...(placements.untiered ?? [])],
    };
    void savePlacements();
  }

  function removeCharacter(ref: string) {
    clearTimeout(stateSaveTimer);
    stateSaveTimer = undefined;
    placements = Object.fromEntries(
      Object.entries(placements).map(([cellId, refs]) => [
        cellId,
        refs.filter((item) => item !== ref),
      ]),
    );
    selectedRef = null;
    void savePlacements();
  }

  function openPanel(ref: string) {
    closePanel();
    selectedRef = ref;
    const state = getState(ref);
    selectedComment = state?.comment ?? "";
    selectedBadges = state?.badges ?? [];
  }

  function closePanel() {
    if (stateSaveTimer) {
      clearTimeout(stateSaveTimer);
      stateSaveTimer = undefined;
      void saveState();
    }
    selectedRef = null;
  }

  function toggleBadge(id: string) {
    selectedBadges = selectedBadges.includes(id)
      ? selectedBadges.filter((badge) => badge !== id)
      : [...selectedBadges, id];
    scheduleStateSave(200);
  }

  function scheduleStateSave(delay: number) {
    clearTimeout(stateSaveTimer);
    status = "saving";
    stateSaveTimer = setTimeout(() => {
      stateSaveTimer = undefined;
      void saveState();
    }, delay);
  }

  async function saveState() {
    if (!selectedRef || !selectedChar) return;
    const listId = version.id;
    const ref = selectedRef;
    const char = selectedChar;
    const payload = {
      uuid: selectedState?.uuid,
      ref,
      char: char.id,
      comment: selectedComment,
      badges: selectedBadges,
    };
    states = [...states.filter((state) => state.ref !== ref), { ...selectedState, ...payload, list: listId } as State];
    try {
      const result = await saveStateRemote({ ...payload, list: listId });
      if (version.id !== listId) return;
      states = result.states ?? states;
      status = "saved";
      clearTimeout(savedStatusTimer);
      savedStatusTimer = setTimeout(() => (status = "idle"), 1500);
    } catch (error) {
      if (version.id !== listId) return;
      console.error(error);
      status = "error";
    }
  }

  function badgeSlots(ref: string) {
    const state = getState(ref);
    return [...(state?.badges ?? []), ...(state?.comment ? ["__comment__"] : [])]
      .filter(Boolean)
      .slice(0, 4);
  }

  const badgePositions = [
    "right-0.5 bottom-0.5",
    "bottom-0.5 left-0.5",
    "top-0.5 right-0.5",
    "top-0.5 left-0.5",
  ];
</script>

<div class="flex h-full min-h-svh flex-col justify-between">
  {#if version.disclaimer && disclaimerOpen}
    <Dialog.Root open={disclaimerOpen} onOpenChange={(open) => (disclaimerOpen = open)}>
      <Dialog.Content class="z-[100] h-full w-full max-w-none border-0 bg-black/70 p-0 backdrop-blur-sm">
      <FadeImage
        src={`/cdn/${version.disclaimer}`}
        alt="Disclaimer"
        class="h-full w-full object-contain"
      />
      <Dialog.Close class="absolute top-2 right-2">
        {#snippet child({ props })}<Button variant="outline" size="icon" {...props} aria-label="Close Disclaimer"><X /></Button>{/snippet}
      </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
  <div class="min-h-0 flex-1 overflow-auto">
    <div
      class="grid w-full *:border"
      style={`grid-template-columns: min-content repeat(${columns.length}, minmax(0, 1fr)); grid-template-rows: min-content min-content repeat(${tiers.length}, minmax(0, min-content));`}
    >
      <div
        class={cn(
          "relative py-1 text-center font-semibold transition-colors duration-200",
          deleteMode ? "bg-red-500/30" : "bg-[#0005]",
        )}
        style="grid-column: 1 / -1"
      >
        <span>
          {type.name} เวอร์ชั่น {version.name} ระดับ
          <span class="text-yellow-400">{type.mode}</span>
          ใช้ได้ถึง
        </span>
        <span class="text-green-400"> {version.deprecates}</span>
        {#if deleteMode}
          <span class="ml-2 font-semibold text-red-500">
            <TriangleAlert class="inline" /> (คุณอยู่ในโหมดลบตัวละคร)
          </span>
        {/if}
        <span class="absolute right-2">
          {#if editable}
            <span class="rounded border bg-card px-1 text-xs text-muted-foreground">
              {status === "saving"
                ? "กำลัง sync"
                : status === "saved"
                  ? "sync แล้ว"
                  : status === "error"
                    ? "sync ล้มเหลว"
                    : "พร้อมแก้ไข"}
            </span>
          {:else if canEdit}
            <a href={resolve("/tl/[type]/[ver]/admin", { type: type.id, ver: version.id })}>
              <Pencil class="size-4 text-gray-400" />
            </a>
          {:else}
            <span
              class={cn(
                "inline-block size-2 rounded-full",
                connection === "ready"
                  ? "bg-green-400"
                  : connection === "connecting"
                    ? "bg-yellow-400"
                    : "bg-gray-400",
              )}
              title={`Realtime: ${connection}`}
            ></span>
          {/if}
        </span>
      </div>

      <div class="grid place-items-center bg-[#2225]">
        <button
          type="button"
          class="p-2"
          aria-label="Tierlist settings"
          onclick={() => (settingsOpen = !settingsOpen)}
        >
          <Settings class="size-8" />
        </button>
      </div>

      {#each columns as column (column.id)}
        <div
          class="relative flex items-center justify-center bg-[#0005] text-2xl font-bold"
          bind:this={columnElement}
        >
          {#if column.image}
            <FadeImage
              src={`/cdn/${column.image}`}
              alt={column.name}
              class="h-auto max-h-13 w-full object-contain p-2"
            />
          {:else}
            {column.name}
          {/if}
        </div>
      {/each}

      {#each tiers as tier (tier.id)}
        <div class="flex items-center justify-center bg-[#0005] text-4xl font-bold">
          {#if tier.image}
            <FadeImage
              src={`/cdn/${tier.image}`}
              alt={tier.name}
              class="max-w-12 object-contain"
            />
          {:else}
            {tier.name}
          {/if}
        </div>
        {#each columns as column (column.id)}
          {@const cellId = `${tier.id}-${column.id}`}
          <section
            class="flex flex-wrap content-start items-start gap-2 p-1"
            aria-label={`${tier.name} ${column.name}`}
            style={`min-height: ${tileSize + 8}px`}
            use:dndzone={{
              items: cellItems(cellId),
              type: "tierlist",
              dragDisabled: !editable,
              dropFromOthersDisabled: !editable,
              flipDurationMs: 120,
              morphDisabled: true,
              centreDraggedOnCursor: true,
            }}
            onconsider={(event) => updateCell(cellId, event)}
            onfinalize={(event) => handleFinalize(cellId, event)}
          >
            {#each cellItems(cellId) as item (item.id)}
              {@const char = getChar(item.id)}
              {#if char}
                <button
                  type="button"
                  class={cn(
                    "relative rounded hover:brightness-110",
                    editable && "cursor-grab active:cursor-grabbing",
                  )}
                  aria-label={char.name}
                  onclick={() => openPanel(item.id)}
                  oncontextmenu={(event) => {
                    event.preventDefault();
                    if (editable && deleteMode) removeCharacter(item.id);
                    else openPanel(item.id);
                  }}
                >
                  {@render CharacterTile({
                    char,
                    refId: item.id,
                    state: getState(item.id),
                    badges,
                    tileSize,
                    badgeSize,
                    badgeSlots,
                    badgePositions,
                  })}
                  {#if editable && deleteMode}
                    <span class="absolute inset-0 grid place-items-center rounded bg-black/40 text-red-500 opacity-0 transition-opacity hover:opacity-100">
                      <Trash2 />
                    </span>
                  {/if}
                </button>
              {/if}
            {/each}
          </section>
        {/each}
      {/each}
    </div>
  </div>

  <div class="flex flex-col">
    <Button
      onclick={() => (untieredOpen = !untieredOpen)}
      variant="outline"
      class="flex rounded-none"
    >
      {#if editable && untieredOpen}<div class="h-4 w-9"></div>{/if}
      <span class="flex w-full items-center justify-center gap-1">
        ({placements.untiered?.length ?? 0}) ตัวละครที่ไม่ได้อยู่ในเทียร์
        {#if untieredOpen}
          <ChevronDown class="ml-1" />
        {:else}
          <ChevronUp class="ml-1" />
        {/if}
      </span>
      {#if editable && untieredOpen}
        <div class="flex items-center justify-center gap-2">
          <Select.Root type="single" bind:value={newCharacter}>
            <Select.Trigger class="max-w-44" onclick={(event) => event.stopPropagation()}><span>เพิ่มตัวละคร</span></Select.Trigger>
            <Select.Content>
              {#each chars.toSorted((a, b) => a.name.localeCompare(b.name)) as char (char.id)}
                <Select.Item value={char.id}>{char.name}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          <button
            type="button"
            aria-label="Toggle delete mode"
            onclick={(event) => {
              event.stopPropagation();
              deleteMode = !deleteMode;
            }}
          >
            <Trash2 class={cn("text-red-500", deleteMode && "animate-pulse")} />
          </button>
          <CopyPlus class="text-emerald-400" />
        </div>
      {/if}
    </Button>
    <div bind:this={untieredElement}>
      {#if untieredOpen}
        <section
        class="flex flex-wrap gap-2 overflow-auto bg-[#0005] p-1"
        aria-label="Untiered characters"
        style={`max-height: ${(tileSize + 4) * 3 + 4}px`}
        use:dndzone={{
          items: cellItems("untiered"),
          type: "tierlist",
          dragDisabled: !editable,
          dropFromOthersDisabled: !editable,
          flipDurationMs: 120,
          morphDisabled: true,
          centreDraggedOnCursor: true,
        }}
        onconsider={(event) => updateCell("untiered", event)}
        onfinalize={(event) => handleFinalize("untiered", event)}
      >
        {#each cellItems("untiered") as item (item.id)}
          {@const char = getChar(item.id)}
          {#if char}
            <button
              type="button"
              class={cn(
                "relative rounded hover:brightness-110",
                editable && "cursor-grab active:cursor-grabbing",
              )}
              aria-label={char.name}
              onclick={() => openPanel(item.id)}
              oncontextmenu={(event) => {
                event.preventDefault();
                if (editable && deleteMode) removeCharacter(item.id);
                else openPanel(item.id);
              }}
            >
              {@render CharacterTile({
                char,
                refId: item.id,
                state: getState(item.id),
                badges,
                tileSize,
                badgeSize,
                badgeSlots,
                badgePositions,
              })}
              {#if editable && deleteMode}
                <span class="absolute inset-0 grid place-items-center rounded bg-black/40 text-red-500 opacity-0 transition-opacity hover:opacity-100">
                  <Trash2 />
                </span>
              {/if}
            </button>
          {/if}
        {/each}
        </section>
      {/if}
    </div>
  </div>
</div>

<Dialog.Root bind:open={settingsOpen}>
  <Dialog.Content class="w-full max-w-md">
      <Dialog.Header><Dialog.Title>การตั้งค่า</Dialog.Title></Dialog.Header>
      <div class="grid gap-4">
        <Label class="grid gap-2">
          <span class="flex items-center gap-1">
            ขนาดตัวละคร (px)
            {#if !tileSizeSetting}<Calculator class="size-4 text-emerald-400" />{/if}
          </span>
          <Input
            type="number"
            value={tileSizeSetting || Math.round(tileSizeAuto)}
            oninput={(event) =>
              (tileSizeSetting = Number((event.currentTarget as HTMLInputElement).value) || null)}
            min="40"
          />
          <div class="flex gap-2">
            <Button variant="outline" onclick={() => (tileSizeSetting = (tileSizeSetting || tileSize) + 1)}>
              <ChevronUp />
            </Button>
            <Button variant="outline" onclick={() => (tileSizeSetting = (tileSizeSetting || tileSize) - 1)}>
              <ChevronDown />
            </Button>
            <Button variant="outline" onclick={() => (tileSizeSetting = null)}>
              <Calculator /> อัตโนมัติ
            </Button>
          </div>
        </Label>
        <Label class="grid gap-2">
          <span>ขนาดเครื่องหมาย (px)</span>
          <Input
            type="number"
            bind:value={badgeSize}
            min="12"
          />
        </Label>
        <a href={resolve("/tl")} class="flex items-center gap-2 text-muted-foreground hover:underline">
          <Home class="size-4" /> หน้าหลัก
        </a>
        {#if canEdit && !editable}
          <a
            href={resolve("/tl/[type]/[ver]/admin", { type: type.id, ver: version.id })}
            class="flex items-center gap-2 text-muted-foreground hover:underline"
          >
            <Pencil class="size-4" /> ไปหน้าแก้ไข
          </a>
        {/if}
        {#if version.disclaimer}
          <button
            type="button"
            class="flex items-center gap-2 text-left text-muted-foreground hover:underline"
            onclick={() => {
              settingsOpen = false;
              disclaimerOpen = true;
            }}
          >
            <FileQuestionMark class="size-4" /> แสดงเงื่อนไข
          </button>
        {/if}
      </div>
  </Dialog.Content>
</Dialog.Root>

{#if selectedRef && selectedChar}
  <Dialog.Root open={true} onOpenChange={(open) => !open && closePanel()}>
    <Dialog.Content class="max-h-full w-full max-w-lg overflow-auto">
      <Dialog.Header><Dialog.Title>{selectedChar.name}</Dialog.Title></Dialog.Header>
      <div class="flex flex-col gap-4 sm:flex-row">
        <div class="shrink-0">
          {@render CharacterTile({
            char: selectedChar,
            refId: selectedRef,
            state: selectedState,
            badges,
            tileSize,
            badgeSize,
            badgeSlots,
            badgePositions,
          })}
          <a
            href={`https://gi.yatta.moe/en/archive/avatar/${selectedChar.amber}/${selectedChar.name.replace(/ /g, "-").toLowerCase()}`}
            target="_blank"
            rel="noreferrer noopener"
            class="mt-2 block rounded border px-2 py-1 text-center text-xs hover:bg-accent"
          >
            เปิดใน Amber
          </a>
        </div>
        <div class="grid grow gap-3">
          {#if editable}
            <div class="grid grid-cols-4 gap-1">
              {#each badges.filter((badge) => selectedBadges.includes(badge.id) || !badge.tier.length || !selectedTier || badge.tier.includes(selectedTier)) as badge (badge.id)}
                <button
                  type="button"
                  class={cn(
                    "min-h-8 rounded border p-1 text-xs hover:bg-accent",
                    selectedBadges.includes(badge.id) && "bg-primary/40",
                  )}
                  onclick={() => toggleBadge(badge.id)}
                >
                  {#if badge.image}
                    <FadeImage src={`/cdn/${badge.image}`} alt={badge.name} class="mx-auto size-8" />
                  {:else}
                    {badge.name}
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
          <label class="grid gap-2">
            <span class="flex items-center gap-1">
              <MessageSquareText class="size-4" /> Comment
            </span>
            <textarea
              class="aspect-square resize-none rounded border bg-background p-2 disabled:opacity-90"
              placeholder="Comment..."
              bind:value={selectedComment}
              oninput={() => scheduleStateSave(500)}
              disabled={!editable}
            ></textarea>
          </label>
          {#if editable}
            <div class="flex justify-between gap-2">
              <Button variant="destructive" type="button" onclick={() => removeCharacter(selectedRef!)}>
                <Trash2 /> ลบตัวละคร
              </Button>
              <span class="self-center text-xs text-muted-foreground">
                {status === "saving"
                  ? "กำลังบันทึก..."
                  : status === "saved"
                    ? "บันทึกแล้ว"
                    : status === "error"
                      ? "บันทึกล้มเหลว"
                      : "บันทึกอัตโนมัติ"}
              </span>
            </div>
          {/if}
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Root>
{/if}

{#snippet CharacterTile({
  char,
  refId,
  state,
  badges,
  tileSize,
  badgeSize,
  badgeSlots,
  badgePositions,
}: {
  char: Char;
  refId: string;
  state?: State;
  badges: Badge[];
  tileSize: number;
  badgeSize: number;
  badgeSlots: (ref: string) => string[];
  badgePositions: string[];
})}
  <div
    class="relative overflow-hidden rounded"
    style={`width: ${tileSize}px; height: ${tileSize}px; background: rgba(${
      char.stars === 5 ? "200,124,36" : char.stars === 4 ? "148,112,187" : "100,100,100"
    }) linear-gradient(136deg,rgba(49,43,71,.5294117647058824),transparent);`}
  >
    <FadeImage
      src={`/cdn/${char.image}`}
      alt={char.name}
      class="h-full w-full object-cover"
      width={tileSize}
      height={tileSize}
    />
    {#each badgeSlots(refId) as item, index (`${item}-${index}`)}
      {#if item === "__comment__"}
        <div
          style={`width: ${badgeSize}px; height: ${badgeSize}px`}
          class={`absolute ${badgePositions[index]} flex items-center justify-center rounded border bg-[#2228]`}
        >
          <MessageSquareText style={`width: ${badgeSize * 0.7}px; height: ${badgeSize * 0.7}px`} />
        </div>
      {:else}
        {@const badge = badges.find((entry) => entry.id === item)}
        {#if badge?.image}
          <FadeImage
            src={`/cdn/${badge.image}`}
            alt={badge.name}
            width={badgeSize}
            height={badgeSize}
            class={`absolute ${badgePositions[index]} rounded border bg-[#2228]`}
          />
        {:else if badge}
          <div
            style={`width: ${badgeSize}px; height: ${badgeSize}px`}
            class={`absolute ${badgePositions[index]} rounded border bg-[#2228] text-xs font-bold`}
          >
            {badge.name}
          </div>
        {/if}
      {/if}
    {/each}
    {#if state?.comment}
      <span class="sr-only">{state.comment}</span>
    {/if}
  </div>
{/snippet}
