<script lang="ts">
  import {
    Copy,
    CopyCheck,
    Image as ImageIcon,
    RefreshCw,
    ScanSearch,
  } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import type { PageData } from "./$types";
  import { revalidateCard } from "../artifact-admin.remote";

  let { data }: { data: PageData } = $props();
  let copied = $state(false);
  let useWeb = $state(false);
  let ready = $state(false);
  let failed = $state("");
  let tick = $state(Date.now());

  async function copyUid() {
    if (copied) return;
    await navigator.clipboard.writeText(data.sub.uid);
    copied = true;
    window.setTimeout(() => (copied = false), 2000);
  }

  async function refreshCard() {
    ready = false;
    failed = "";
    if (!useWeb) await revalidateCard(data.sub.id);
    tick = Date.now();
  }
</script>

<svelte:head>
  <title>{data.sub.name} · Artifact Admin</title>
</svelte:head>

<div class="flex h-svh flex-col gap-2 p-2">
  <section class="grid gap-2 md:grid-cols-[1fr_11rem]">
    <article class="rounded-xl border bg-card/75 p-5 shadow-sm backdrop-blur">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 class="text-2xl font-bold">
            {data.sub.queue ?? "ลัดคิว"}. {data.sub.name}
          </h1>
          <p class="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {data.sub.comment || "ไม่มีข้อความเพิ่มเติม"}
          </p>
        </div>
        <div
          class={[
            "rounded-full border px-3 py-1 text-xs",
            data.sub.checked ? "border-emerald-400 text-emerald-300" : "border-yellow-400 text-yellow-300",
          ]}
        >
          {data.sub.checked ? "checked" : "pending"}
        </div>
      </div>
      <div class="mt-5 flex items-center gap-2">
        <span class="font-mono text-muted-foreground">{data.sub.uid}</span>
        <Button variant="ghost" size="icon" onclick={copyUid} disabled={copied}>
          {#if copied}
            <CopyCheck class="size-4" />
          {:else}
            <Copy class="size-4" />
          {/if}
        </Button>
      </div>
    </article>

    <aside class="overflow-hidden rounded-xl border bg-card/75 p-3 backdrop-blur">
      {#if data.char}
        <div class="relative aspect-square overflow-hidden rounded-md border bg-black/20">
          <img
            class="h-full w-full object-cover"
            src={`/cdn/${data.char.image}`}
            alt={data.char.name}
          />
        </div>
        <div class="mt-2 text-center">
          <div class="font-semibold">{data.char.name}</div>
          <div class="text-xs text-muted-foreground">
            {data.char.stars}★ · {data.char.vision} · {data.char.weapon}
          </div>
        </div>
      {:else}
        <div class="flex aspect-square items-center justify-center rounded-md border text-sm text-muted-foreground">
          No character
        </div>
      {/if}
    </aside>
  </section>

  <section class="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-card/75 backdrop-blur">
    {#if data.config.enka}
      {#if !ready && !failed}
        <div class="absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-xl border bg-background/80 p-4 backdrop-blur">
          <ScanSearch class="size-8 animate-pulse" />
          <span>กำลังโหลดข้อมูล...</span>
        </div>
      {/if}
      {#if failed}
        <div class="absolute top-1/2 left-1/2 z-10 max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-destructive/50 bg-background/90 p-4 text-center text-destructive backdrop-blur">
          {failed}
        </div>
      {/if}

      <div class="absolute bottom-2 left-2 z-20 flex gap-1">
        <Button
          variant="outline"
          size="icon"
          onclick={() => {
            ready = false;
            failed = "";
            useWeb = !useWeb;
          }}
        >
          <ImageIcon class="size-4" />
        </Button>
        <Button variant="outline" size="icon" onclick={refreshCard}>
          <RefreshCw class="size-4" />
        </Button>
      </div>

      {#if useWeb}
        <iframe
          class={[
            "-mt-20 h-[calc(100%+5rem)] w-full border-0 bg-card",
            !ready && "pointer-events-none blur-md brightness-50 grayscale",
          ]}
          src={`https://enka.network/u/${data.sub.uid}?t=${tick}`}
          title="Enka Network"
          onload={() => (ready = true)}
        ></iframe>
      {:else}
        <img
          class={[
            "h-full w-full object-contain transition-[filter] portrait:scale-175 portrait:rotate-90",
            (!ready || failed) && "pointer-events-none blur-md brightness-50 grayscale",
          ]}
          src={`/api/card/${data.sub.id}?t=${tick}`}
          alt={`Enka card for ${data.sub.name}`}
          onload={() => {
            ready = true;
            failed = "";
          }}
          onerror={() => {
            failed = "ไม่สามารถโหลดข้อมูลตัวละคร";
          }}
        />
      {/if}
    {:else}
      <div class="flex h-full items-center justify-center p-6 text-muted-foreground">
        Enka card preview is disabled in settings.
      </div>
    {/if}
  </section>
</div>
