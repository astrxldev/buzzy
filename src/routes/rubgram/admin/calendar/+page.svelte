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
  import { Button } from "$lib/components/ui/button";
  import type { PageData } from "./$types";
  import { toggleMonth } from "../rubgram-admin.remote";

  let { data }: { data: PageData } = $props();
  let pending = $state(false);

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
    {#each days as day}
      <div class="p-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
    {/each}
    {#each Array.from({ length: leading }) as _}
      <div></div>
    {/each}
    {#each Array.from({ length: daysInMonth }, (_, i) => i + 1) as day}
      {@const rows = rowsByDay[day] || []}
      {@const dayTotal = rows.reduce((sum, row) => sum + row.price, 0)}
      <details
        class={[
          "overflow-hidden rounded-md border p-2",
          rows.length ? "border-primary/30 bg-primary/5" : "border-transparent",
        ]}
      >
        <summary class="cursor-pointer list-none">
          <div class="flex items-start justify-between gap-1">
            <span class="text-sm">{day}</span>
            {#if rows.length}
              <span class="rounded bg-muted px-1 text-[10px]">{rows.length} คิว</span>
            {/if}
          </div>
          {#if rows.length}
            <div class="text-[10px] text-muted-foreground">{dayTotal.toLocaleString()} ฿</div>
          {/if}
        </summary>
        {#if rows.length}
          <div class="mt-2 grid max-h-64 gap-2 overflow-y-auto">
            {#each rows as row}
              <a
                class={[
                  "grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 rounded-md border bg-card/70 p-2 text-xs hover:bg-accent",
                  row.deleted && "opacity-50",
                ]}
                href={`/rubgram/admin/${row.id}`}
              >
                {#if row.slipInfo}
                  <img
                    class="size-10 rounded object-cover blur-[1px] brightness-75"
                    src={`/api/slip/${row.slipInfo.id}`}
                    alt="Slip"
                  />
                {:else if row.price <= 0}
                  <div class="flex size-10 items-center justify-center rounded bg-muted">
                    <ReceiptText class="size-5" />
                  </div>
                {:else}
                  <div class="flex size-10 items-center justify-center rounded bg-muted">
                    <ImageOff class="size-5" />
                  </div>
                {/if}
                <div class="min-w-0">
                  <div class="truncate font-medium">{row.queue}. {row.name}</div>
                  <div class="truncate text-muted-foreground">
                    {row.discord?.username || row.user} · {row.service.join(", ")}
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  {#if row.deleted}
                    <Trash2 class="size-3.5 text-destructive" />
                  {/if}
                  <ExternalLink class="size-3.5" />
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </details>
    {/each}
  </div>
</div>
