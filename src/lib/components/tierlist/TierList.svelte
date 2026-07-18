<script lang="ts">
  import {
    ChevronDown,
    ChevronUp,
    CopyPlus,
    Home,
    MessageSquareText,
    Pencil,
    Settings,
    Trash2,
    TriangleAlert,
    X,
  } from "lucide-svelte";
  import { tick } from "svelte";
  import { dndzone } from "svelte-dnd-action";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import { Button } from "$lib/components/ui/button";
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
  }: {
    type: typeof tierlistTypes.$inferSelect;
    version: typeof tierlistVersions.$inferSelect;
    chars: Char[];
    tiers: Tier[];
    columns: Column[];
    badges: Badge[];
    states: State[];
    editable?: boolean;
  } = $props();

  const cellIds = $derived([
    ...tiers.flatMap((tier) =>
      columns.map((column) => `${tier.id}-${column.id}`),
    ),
    "untiered",
  ]);

  const initialPlacements = $derived.by(() => {
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
  });

  let placements = $state<Record<string, string[]>>({});
  let states = $state<State[]>([]);
  let untieredOpen = $state(true);
  let tileSize = $state(72);
  let badgeSize = $state(24);
  let settingsOpen = $state(false);
  let deleteMode = $state(false);
  let selectedRef = $state<string | null>(null);
  let selectedComment = $state("");
  let selectedBadges = $state<string[]>([]);
  let saving = $state(false);
  let status = $state<"idle" | "saving" | "saved" | "error">("idle");

  $effect(() => {
    placements = structuredClone(initialPlacements);
  });

  $effect(() => {
    states = initialStates;
  });

  const selectedChar = $derived(
    selectedRef ? chars.find((char) => char.id === selectedRef!.split("#")[0]) : undefined,
  );
  const selectedState = $derived(
    selectedRef ? states.find((state) => state.ref === selectedRef) : undefined,
  );

  $effect(() => {
    if (!selectedRef) return;
    selectedComment = selectedState?.comment ?? "";
    selectedBadges = selectedState?.badges ?? [];
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

  async function savePlacements() {
    if (!editable) return;
    status = "saving";
    try {
      await savePlacementsRemote({ list: version.id, placements });
      status = "saved";
    } catch (error) {
      console.error(error);
      status = "error";
    }
  }

  async function handleFinalize(cellId: string, event: DndEvent) {
    updateCell(cellId, event);
    await tick();
    await savePlacements();
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
    selectedRef = ref;
  }

  function toggleBadge(id: string) {
    selectedBadges = selectedBadges.includes(id)
      ? selectedBadges.filter((badge) => badge !== id)
      : [...selectedBadges, id].slice(0, 4);
  }

  async function saveState() {
    if (!selectedRef || !selectedChar) return;
    saving = true;
    try {
      const payload = {
        uuid: selectedState?.uuid,
        ref: selectedRef,
        char: selectedChar.id,
        comment: selectedComment,
        badges: selectedBadges,
      };
      const result = await saveStateRemote({ ...payload, list: version.id });
      states = result.states ?? states;
      selectedRef = null;
    } finally {
      saving = false;
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
  {#if version.disclaimer}
    <div class="sr-only">มีภาพเงื่อนไขสำหรับเทียร์ลิสต์นี้</div>
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
          {:else}
            <a href={`/tl/${type.id}/${version.id}/admin`}>
              <Pencil class="size-4 text-gray-400" />
            </a>
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

      {#each columns as column}
        <div class="relative flex items-center justify-center bg-[#0005] text-2xl font-bold">
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

      {#each tiers as tier}
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
        {#each columns as column}
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
            }}
            onconsider={(event) => updateCell(cellId, event)}
            onfinalize={(event) => handleFinalize(cellId, event)}
          >
            {#each cellItems(cellId) as item (item.id)}
              {@const char = getChar(item.id)}
              {#if char}
                <button
                  type="button"
                  class="relative rounded hover:brightness-110"
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
          <select
            class="max-w-44 rounded border bg-card px-2 py-1 text-sm"
            onclick={(event) => event.stopPropagation()}
            onchange={(event) => {
              const value = (event.currentTarget as HTMLSelectElement).value;
              if (value) addCharacter(value);
              (event.currentTarget as HTMLSelectElement).value = "";
            }}
          >
            <option value="">เพิ่มตัวละคร</option>
            {#each chars.toSorted((a, b) => a.name.localeCompare(b.name)) as char}
              <option value={char.id}>{char.name}</option>
            {/each}
          </select>
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
        }}
        onconsider={(event) => updateCell("untiered", event)}
        onfinalize={(event) => handleFinalize("untiered", event)}
      >
        {#each cellItems("untiered") as item (item.id)}
          {@const char = getChar(item.id)}
          {#if char}
            <button
              type="button"
              class="relative rounded hover:brightness-110"
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
            </button>
          {/if}
        {/each}
      </section>
    {/if}
  </div>
</div>

{#if settingsOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
    <div class="w-full max-w-md rounded-xl border bg-card p-4">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-bold">การตั้งค่า</h2>
        <Button size="icon" variant="ghost" onclick={() => (settingsOpen = false)}>
          <X />
        </Button>
      </div>
      <div class="grid gap-4">
        <label class="grid gap-2">
          <span>ขนาดตัวละคร (px)</span>
          <input
            class="rounded border bg-background px-2 py-1"
            type="number"
            bind:value={tileSize}
            min="40"
          />
        </label>
        <label class="grid gap-2">
          <span>ขนาดเครื่องหมาย (px)</span>
          <input
            class="rounded border bg-background px-2 py-1"
            type="number"
            bind:value={badgeSize}
            min="12"
          />
        </label>
        <a href="/tl" class="flex items-center gap-2 text-muted-foreground hover:underline">
          <Home class="size-4" /> หน้าหลัก
        </a>
      </div>
    </div>
  </div>
{/if}

{#if selectedRef && selectedChar}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
    <div class="w-full max-w-lg rounded-xl border bg-card p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xl font-bold">{selectedChar.name}</h2>
        <Button size="icon" variant="ghost" onclick={() => (selectedRef = null)}>
          <X />
        </Button>
      </div>
      <div class="flex gap-4">
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
              {#each badges.filter((badge) => !badge.tier.length || selectedBadges.includes(badge.id)) as badge}
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
              disabled={!editable}
            ></textarea>
          </label>
          {#if editable}
            <div class="flex justify-between gap-2">
              <Button variant="destructive" type="button" onclick={() => removeCharacter(selectedRef!)}>
                <Trash2 /> ลบตัวละคร
              </Button>
              <Button type="button" disabled={saving} onclick={saveState}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
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
    {#each badgeSlots(refId) as item, index}
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
