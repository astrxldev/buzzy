<script lang="ts">
  import { Dice3, Lock, Search, Trash2, Unlock } from "lucide-svelte";
  import { onMount } from "svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import type { LayoutData } from "./$types";
  import {
    random,
    setLimit,
    toggleCheck,
    toggleLock,
    wipe,
  } from "./artifact-admin.remote";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } =
    $props();
  let query = $state("");
  let busy = $state("");

  const selectedId = $derived(page.params.id);
  const filtered = $derived(
    data.subs.filter((sub) =>
      `${sub.queue ?? ""} ${sub.name} ${sub.uid} ${sub.comment}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
  );

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
    if (sub?.id) await goto(`/artifact/admin/${sub.id}`);
  }

  async function updateLimit() {
    const value = window.prompt(
      "ตั้ง limit (-1 = ไม่จำกัด)",
      data.config.limit >= 0 ? `${data.config.limit}` : "",
    );
    if (value === null) return;
    await run("limit", () => setLimit(Number(value) || -1));
  }

  async function wipeAll() {
    if (!window.confirm("ล้างข้อมูล artifact submissions ทั้งหมด?")) return;
    await run("wipe", () => wipe());
    await goto("/artifact/admin");
  }

  onMount(() => {
    const source = new EventSource("/sse/artifact");
    source.addEventListener("update", () => void invalidateAll());
    const interval = window.setInterval(async () => {
      await fetch("/api/artifact/count")
        .then(() => invalidateAll())
        .catch(() => {});
    }, 120000);
    return () => {
      source.close();
      window.clearInterval(interval);
    };
  });
</script>

<svelte:head>
  <title>เสือกไอดีชาวบ้าน (แอดมิน)</title>
</svelte:head>

<div class="grid min-h-svh bg-background/20 md:grid-cols-[20rem_1fr]">
  <aside class="flex min-h-svh flex-col border-r bg-card/70 backdrop-blur-xl">
    <header class="flex items-center justify-between border-b p-3">
      <a class="font-bold" href="/admin">Admin</a>
      <div class="flex gap-1">
        <Button variant="ghost" size="icon" disabled={!!busy} onclick={goRandom}>
          <Dice3 class="size-5" />
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
      <div class="text-xs text-muted-foreground">
        เสือกไอดีชาวบ้าน
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 pb-3">
      {#each filtered as sub (sub.id)}
        <a
          class={[
            "mb-1 flex min-h-9 items-center justify-between rounded-md border px-2 py-1 text-sm transition-colors hover:bg-accent",
            selectedId === sub.id && "bg-accent text-accent-foreground",
            (sub.queue === null || sub.promoted) && "border-yellow-400",
            sub.checked && "opacity-60",
          ]}
          href={`/artifact/admin/${sub.id}`}
        >
          <span class="min-w-0 truncate">
            {#if sub.queue === null}
              ลัดคิว · {sub.name}
            {:else}
              {sub.queue}. {sub.name}
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
          {data.count}{data.config.limit >= 0 ? `/${data.config.limit}` : ""}
        </span>
      </button>
    </footer>
  </aside>

  <main class="min-h-svh overflow-hidden">
    {@render children()}
  </main>
</div>
