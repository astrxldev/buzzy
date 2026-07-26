<script lang="ts">
  import { Bitcoin, Copy, Dice3, ListFilter, Lock, Menu, Search, Trash2, Unlock, X } from "lucide-svelte";
  import { onMount } from "svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Input } from "$lib/components/ui/input";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import PromptDialog from "$lib/components/PromptDialog.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { toast } from "svelte-sonner";
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
  let limitDialogOpen = $state(false);
  let wipeDialogOpen = $state(false);
  let limitValue = $state("");
  let drawerOpen = $state(false);

  const selectedId = $derived(page.params.id);
  const filtered = $derived(
    data.subs.filter((sub) =>
      `${sub.queue ?? ""} ${sub.name} ${sub.uid} ${sub.comment}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
  );

  async function run<T>(key: string, fn: () => Promise<T>, success = "บันทึกการเปลี่ยนแปลงแล้ว") {
    busy = key;
    try {
      const result = await fn();
      toast.success(success);
      return result;
    } catch (error) {
      toast.error(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : error}`);
      return undefined;
    } finally {
      busy = "";
      await invalidateAll();
    }
  }

  async function goRandom() {
    const sub = await run("random", () => random());
    if (sub?.id) await goto(resolve("/artifact/admin/[id]", { id: sub.id }));
  }

  function updateLimit() {
    limitValue = data.config.limit >= 0 ? `${data.config.limit}` : "";
    limitDialogOpen = true;
  }

  async function saveLimit(value: string) {
    await run("limit", () => setLimit(Number(value) || -1));
  }

  async function confirmWipe() {
    const result = await run("wipe", () => wipe());
    if (result) await goto(resolve("/artifact/admin"));
  }

  function wipeAll() {
    wipeDialogOpen = true;
  }

  async function copyUid(uid: string) {
    try {
      await navigator.clipboard.writeText(uid);
      toast.success("คัดลอก UID แล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาด: คัดลอก UID ไม่สำเร็จ");
    }
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

<div class="min-h-svh bg-background/20 md:grid md:grid-cols-[20rem_1fr]">
  <Button class="fixed top-3 left-3 z-40 md:hidden" variant="outline" size="icon" onclick={() => (drawerOpen = true)} aria-label="เปิดเมนู">
    <Menu />
  </Button>
  {#if drawerOpen}<button class="fixed inset-0 z-40 bg-black/50 md:hidden" aria-label="ปิดเมนู" onclick={() => (drawerOpen = false)}></button>{/if}
  <aside class="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[calc(100vw-2rem)] -translate-x-full flex-col border-r bg-card/95 shadow-xl backdrop-blur-xl transition-transform md:static md:z-auto md:w-auto md:translate-x-0 md:bg-card/70 md:shadow-none" class:translate-x-0={drawerOpen}>
    <header class="flex items-center justify-between border-b p-3">
      <a class="font-bold" href={resolve("/admin")}>Admin</a>
      <div class="flex gap-1">
        <Button class="md:hidden" variant="ghost" size="icon" onclick={() => (drawerOpen = false)} aria-label="ปิดเมนู"><X /></Button>
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
        <div
          class={[
            "group relative mb-1 flex min-h-9 items-center justify-between rounded-md border px-2 py-1 text-sm transition-colors hover:bg-accent",
            selectedId === sub.id && "bg-accent text-accent-foreground",
            (sub.queue === null || sub.promoted) && "border-yellow-400",
            sub.checked && "opacity-60",
          ]}
        >
          <a class="min-w-0 flex-1" href={resolve("/artifact/admin/[id]", { id: sub.id })} onclick={() => (drawerOpen = false)}>
            <span class="block truncate">
              {#if sub.queue === null}<Bitcoin class="mr-1 inline size-5 text-yellow-400" />{sub.name}{:else}{sub.queue}. {sub.name}{/if}
            </span>
            {#if sub.queue === null || sub.promoted}
              <span class="block truncate text-[10px] text-muted-foreground">{sub.uid} · {sub.comment || "ไม่มีข้อความ"}</span>
            {/if}
          </a>
          {#if sub.queue === null || sub.promoted}
            <div class="pointer-events-none absolute top-full left-0 z-50 hidden w-[34rem] max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-3 text-popover-foreground shadow-md group-hover:block">
              <div class="font-semibold">{sub.name}</div>
              <div class="line-clamp-3">{sub.comment}</div>
              <div class="mt-1 text-xs text-muted-foreground">ลัดคิว - UID {sub.uid} (คลิ๊กเพื่อคัดลอก)</div>
            </div>
            <button
              class="mr-1 rounded p-1 hover:bg-background"
              type="button"
              title="คัดลอก UID"
              onclick={() => copyUid(sub.uid)}
            ><Copy class="size-3.5" /></button>
          {/if}
          <Checkbox checked={sub.checked} aria-label={`Toggle ${sub.name}`} onchange={() => run(`check-${sub.id}`, () => toggleCheck(sub.id))} />
        </div>
      {/each}
    </nav>

    <footer class="border-t p-3 text-sm">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger class="flex h-9 w-full items-center justify-between rounded-md px-2 hover:bg-accent">
          <span class="flex items-center gap-2">
            <ListFilter class="size-4" />
            ตั้งค่าคิว
          </span>
          <span class="text-xs text-muted-foreground">
            {data.count}{data.config.limit >= 0 ? `/${data.config.limit}` : ""}
          </span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="min-w-52" side="top" align="start">
          <DropdownMenu.Item onclick={updateLimit}>
            <span class="flex-1">จำนวนคิว</span>
            <span class="text-xs text-muted-foreground">{data.config.limit >= 0 ? data.config.limit : "∞"}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => run("lock", () => toggleLock())}>
            {#if data.config.locked}<Lock class="size-4 text-red-500" /> ปิดรับ{:else}<Unlock class="size-4 text-sky-400" /> เปิดรับ{/if}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </footer>
  </aside>

  <main class="min-h-svh overflow-hidden">
    {@render children()}
  </main>
</div>

<PromptDialog
  bind:open={limitDialogOpen}
  bind:value={limitValue}
  title="ตั้งจำนวนคิว"
  description="ใส่ -1 เพื่อไม่จำกัดจำนวนคิว"
  onConfirm={saveLimit}
  confirmText="บันทึก"
/>
<ConfirmDialog
  bind:open={wipeDialogOpen}
  title="ล้างข้อมูลทั้งหมด?"
  description="การล้าง artifact submissions ทั้งหมดไม่สามารถย้อนกลับได้"
  onConfirm={confirmWipe}
  confirmText="ล้างข้อมูล"
/>
