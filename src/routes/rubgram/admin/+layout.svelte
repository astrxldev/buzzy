<script lang="ts">
  import {
    Calendar,
    Dice5,
    Lock,
    Plus,
    Search,
    Trash2,
    Unlock,
  } from "lucide-svelte";
  import { onMount } from "svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import type { LayoutData } from "./$types";
  import {
    bulkDelete,
    random,
    setFree,
    setLimit,
    toggleCheck,
    toggleLock,
    wipe,
  } from "./rubgram-admin.remote";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } =
    $props();
  let query = $state("");
  let debug = $state(false);
  let selected = $state<string[]>([]);
  let busy = $state("");

  const selectedId = $derived(page.params.id);
  const shown = $derived(
    data.subs.filter((sub) => {
      const matches = `${sub.publicQueue} ${sub.name}`.toLowerCase().includes(query.toLowerCase());
      return matches && (debug || (sub.paid && !sub.deleted));
    }),
  );
  const paidLength = $derived(data.subs.filter((sub) => sub.paid && !sub.deleted).length);

  async function run<T>(key: string, fn: () => Promise<T>) {
    busy = key;
    try {
      return await fn();
    } finally {
      busy = "";
      await invalidateAll();
    }
  }

  async function goRandom() {
    const sub = await run("random", () => random());
    if (sub?.id) await goto(`/rubgram/admin/${sub.id}`);
  }

  async function updateLimit() {
    const value = window.prompt(
      "ตั้งจำกัดคิว (-1 = ไม่จำกัด)",
      data.config.limit >= 0 ? `${data.config.limit}` : "",
    );
    if (value === null) return;
    await run("limit", () => setLimit(Number(value) || -1));
  }

  async function updateFree() {
    const value = window.prompt("ตั้งจำนวนคิวฟรี", `${data.config.free || 0}`);
    if (value === null) return;
    await run("free", () => setFree(Number(value) || 0));
  }

  async function wipeAll() {
    if (!window.confirm("ลบ Rubgram submissions ทั้งหมด?")) return;
    await run("wipe", () => wipe());
    await goto("/rubgram/admin");
  }

  async function deleteSelected() {
    if (!selected.length) return;
    if (!window.confirm(`ลบ ${selected.length} รายการ?`)) return;
    await run("bulk", () => bulkDelete(selected));
    selected = [];
  }

  function toggleSelected(id: string, checked: boolean) {
    selected = checked ? [...selected, id] : selected.filter((value) => value !== id);
  }

  onMount(() => {
    const source = new EventSource("/sse/rubgram");
    source.addEventListener("update", () => void invalidateAll());
    const interval = window.setInterval(async () => {
      await fetch("/api/rubgram/count")
        .then(() => invalidateAll())
        .catch(() => {});
    }, 60000);
    return () => {
      source.close();
      window.clearInterval(interval);
    };
  });
</script>

<svelte:head>
  <title>Rubgram Admin</title>
</svelte:head>

<div class="grid min-h-svh bg-background/20 md:grid-cols-[20rem_1fr]">
  <aside class="flex min-h-svh flex-col border-r bg-card/70 backdrop-blur-xl">
    <header class="flex items-center justify-between border-b p-3">
      <a class="font-bold" href="/admin">Admin</a>
      <div class="flex gap-1">
        <Button variant="ghost" size="icon" href="/rubgram/admin/manual">
          <Plus class="size-5" />
        </Button>
        <Button variant="ghost" size="icon" disabled={!!busy} onclick={goRandom}>
          <Dice5 class="size-5" />
        </Button>
        <Button variant="ghost" size="icon" href="/rubgram/admin/calendar">
          <Calendar class="size-5" />
        </Button>
        <Button variant="ghost" size="icon" disabled={!!busy} onclick={wipeAll}>
          <Trash2 class="size-5 text-red-500" />
        </Button>
      </div>
    </header>

    <div class="grid gap-2 p-3">
      <label class="relative">
        <Search class="absolute top-2.5 left-2 size-4 text-muted-foreground" />
        <Input
          class="pl-8"
          type="search"
          bind:value={query}
          placeholder="ค้นหา..."
        />
      </label>
      <label class="flex items-center gap-2 text-xs text-muted-foreground">
        <input class="accent-primary" type="checkbox" bind:checked={debug} />
        debug/list deleted and unpaid
      </label>
    </div>

    {#if selected.length}
      <div class="px-3 pb-2">
        <Button class="w-full" variant="destructive" size="sm" onclick={deleteSelected}>
          <Trash2 class="size-4" />
          ลบ {selected.length} รายการ
        </Button>
      </div>
    {/if}

    <nav class="flex-1 overflow-y-auto px-2 pb-3">
      {#each shown as sub (sub.id)}
        <div class="mb-1 flex items-center gap-1">
          {#if debug}
            <input
              class="size-4 shrink-0 accent-primary"
              type="checkbox"
              checked={selected.includes(sub.id)}
              aria-label={`Select ${sub.name}`}
              onchange={(ev) => toggleSelected(sub.id, ev.currentTarget.checked)}
            />
          {/if}
          <a
            class={[
              "flex min-h-9 flex-1 items-center justify-between rounded-md border px-2 py-1 text-sm transition-colors hover:bg-accent",
              selectedId === sub.id && "bg-accent text-accent-foreground",
              (!sub.paid || sub.deleted) && "opacity-55",
            ]}
            href={`/rubgram/admin/${sub.id}`}
          >
            <span class="min-w-0 truncate">
              {#if sub.checked}
                {sub.name}
              {:else}
                {sub.publicQueue}. {sub.name}
              {/if}
            </span>
            <input
              class="size-4 shrink-0 accent-primary"
              type="checkbox"
              checked={sub.checked}
              aria-label={`Toggle ${sub.name}`}
              onclick={(ev) => ev.stopPropagation()}
              onchange={() => run(`check-${sub.id}`, () => toggleCheck(sub.id))}
            />
          </a>
        </div>
      {/each}
    </nav>

    <footer class="grid gap-2 border-t p-3 text-sm">
      <button
        class="flex h-9 items-center justify-between rounded-md px-2 hover:bg-accent"
        type="button"
        disabled={!!busy}
        onclick={() => run("lock", () => toggleLock())}
      >
        <span class="flex items-center gap-2">
          {#if data.config.locked}
            <Lock class="size-4 text-red-500" />
            ปิดรับ
          {:else}
            <Unlock class="size-4 text-sky-400" />
            เปิดรับ
          {/if}
        </span>
        <span class="text-xs text-muted-foreground">toggle</span>
      </button>
      <button
        class="flex h-9 items-center justify-between rounded-md px-2 hover:bg-accent"
        type="button"
        disabled={!!busy}
        onclick={updateLimit}
      >
        <span>จำนวน</span>
        <span class="text-xs text-muted-foreground">
          {paidLength}{data.config.limit >= 0 ? `/${data.config.limit}` : ""}
        </span>
      </button>
      <button
        class="flex h-9 items-center justify-between rounded-md px-2 hover:bg-accent"
        type="button"
        disabled={!!busy}
        onclick={updateFree}
      >
        <span>คิวฟรี</span>
        <span class="text-xs text-muted-foreground">{data.config.free}</span>
      </button>
    </footer>
  </aside>

  <main class="min-h-svh overflow-hidden">
    {@render children()}
  </main>
</div>
