<script lang="ts">
  import {
    Check,
    ChevronLeft,
    ChevronRight,
    Circle,
    ExternalLink,
    ImageOff,
    ReceiptText,
    Trash2,
  } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import type { PageData } from "./$types";
  import { toggleMonth } from "../rubgram-admin.remote";

  let { data }: { data: PageData } = $props();
  let pending = $state(false);
  let selectedDay = $state<number | null>(null);
  let selectedSlip = $state<string | null>(null);

  const days = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
  const date = $derived(new Date(data.date));
  const year = $derived(date.getFullYear());
  const month = $derived(date.getMonth());
  const daysInMonth = $derived(new Date(year, month + 1, 0).getDate());
  const first = $derived(new Date(year, month, 1).getDay());
  const leading = $derived(first === 0 ? 6 : first - 1);
  const monthKey = $derived(`${year}-${String(month + 1).padStart(2, "0")}`);
  const monthLabel = $derived(
    date.toLocaleDateString("th-TH", { month: "long", year: "numeric" }),
  );
  const monthChecked = $derived(data.monthly[monthKey] ?? false);
  const prevHref = $derived(
    `/rubgram/admin/calendar?month=${formatMonth(new Date(year, month - 1, 1))}`,
  );
  const nextHref = $derived(
    `/rubgram/admin/calendar?month=${formatMonth(new Date(year, month + 1, 1))}`,
  );
  const rowsByDay = $derived.by(() => {
    const grouped: Record<number, PageData["rows"]> = {};
    for (const row of data.rows) {
      const day = new Date(row.submit_day).getDate();
      (grouped[day] ??= []).push(row);
    }
    return grouped;
  });
  const selectedRows = $derived(selectedDay === null ? [] : rowsByDay[selectedDay] || []);
  const selectedTotal = $derived(selectedRows.reduce((sum, row) => sum + row.price, 0));

  function formatMonth(value: Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  }

  async function markMonth() {
    pending = true;
    try {
      await toggleMonth(monthKey);
      await invalidateAll();
    } finally {
      pending = false;
    }
  }
</script>

<svelte:head>
  <title>Rubgram Calendar</title>
</svelte:head>

<div class="flex h-svh flex-col p-4">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2">
      <Button variant="outline" size="icon" href={prevHref}>
        <ChevronLeft class="size-4" />
      </Button>
      <span class="min-w-40 text-center text-lg font-semibold">{monthLabel}</span>
      <Button variant="outline" size="icon" href={nextHref}>
        <ChevronRight class="size-4" />
      </Button>
    </div>

    <button
      class="flex items-center gap-2 rounded-md border bg-card/70 px-3 py-2 text-sm"
      type="button"
      disabled={pending}
      onclick={markMonth}
    >
      {#if monthChecked}
        <Check class="size-4 text-emerald-400" />
      {:else}
        <Circle class="size-4 text-muted-foreground" />
      {/if}
      รวม {data.total.toLocaleString()} บาท
    </button>
  </div>

  <div class="grid flex-1 grid-cols-7 grid-rows-[min-content_repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-xl bg-black/25">
    {#each days as day (day)}
      <div class="p-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
    {/each}
    {#each Array.from({ length: leading }) as _, i (i)}
      <div></div>
    {/each}
    {#each Array.from({ length: daysInMonth }, (_, i) => i + 1) as day (day)}
      {@const rows = rowsByDay[day] || []}
      {@const dayTotal = rows.reduce((sum, row) => sum + row.price, 0)}
      <button
        type="button"
        disabled={!rows.length}
        onclick={() => (selectedDay = day)}
        class={[
          "flex flex-col items-start rounded-md border p-2 text-left transition-colors",
          rows.length ? "cursor-pointer border-primary/30 bg-primary/5 hover:bg-primary/10" : "cursor-default border-transparent",
        ]}
      >
        <div class="flex w-full items-start justify-between gap-1">
          <span class="text-sm">{day}</span>
          {#if rows.length}<span class="rounded bg-muted px-1 text-[10px]">{rows.length} คิว</span>{/if}
        </div>
        {#if rows.length}
          <div class="text-[10px] text-muted-foreground">{dayTotal.toLocaleString()} ฿</div>
        {/if}
      </button>
    {/each}
  </div>
</div>

<Dialog.Root open={selectedDay !== null} onOpenChange={(open) => !open && (selectedDay = null)}>
  <Dialog.Content class="max-h-[80svh] overflow-y-auto sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>
        {selectedDay ?? ""} {monthLabel}
      </Dialog.Title>
    </Dialog.Header>
    <div class="grid gap-2">
      {#each selectedRows as row (row.id)}
        <div class={["flex items-start gap-3 rounded-md border p-3", row.deleted && "opacity-50"]}>
          {#if row.slipInfo}
            <button class="relative size-16 shrink-0 overflow-hidden rounded" type="button" onclick={() => (selectedSlip = row.slipInfo?.id ?? null)}>
              <img class="size-full object-cover blur-sm brightness-50" src={`/api/slip/${row.slipInfo.id}`} alt="Slip" />
              <ExternalLink class="absolute inset-0 m-auto size-4" />
            </button>
          {:else if row.price <= 0}
            <div class="flex size-16 shrink-0 items-center justify-center rounded bg-muted"><ReceiptText /></div>
          {:else}
            <div class="flex size-16 shrink-0 items-center justify-center rounded bg-muted"><ImageOff /></div>
          {/if}
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 font-medium">
              <a class="truncate hover:underline" href={resolve("/rubgram/admin/[id]", { id: row.id })}>{row.queue}. {row.name}</a>
              {#if row.deleted}<Trash2 class="size-3.5 shrink-0 text-destructive" />{/if}
            </div>
            <p class="truncate text-xs text-muted-foreground">{row.service.join(", ")}</p>
            <p class="text-xs">{row.price.toLocaleString()} ฿ · {row.discord?.display || row.discord?.username || row.user}</p>
          </div>
        </div>
      {/each}
    </div>
    <Dialog.Footer><span class="text-sm text-muted-foreground">รวม {selectedTotal.toLocaleString()} บาท</span></Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={selectedSlip !== null} onOpenChange={(open) => !open && (selectedSlip = null)}>
  <Dialog.Content class="flex h-[90svh] max-w-[95vw] flex-col bg-background/70 sm:max-w-4xl">
    <Dialog.Header><Dialog.Title>สลิป</Dialog.Title></Dialog.Header>
    {#if selectedSlip}
      <img class="min-h-0 w-full flex-1 object-contain" src={`/api/slip/${selectedSlip}`} alt="Payment slip" />
    {/if}
  </Dialog.Content>
</Dialog.Root>
