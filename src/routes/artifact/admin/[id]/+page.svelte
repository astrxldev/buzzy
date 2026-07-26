<script lang="ts">
  import {
    Copy,
    CopyCheck,
    Image as ImageIcon,
    OctagonAlert,
    RefreshCw,
    ScanSearch,
    SquircleDashed,
  } from "lucide-svelte";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import { Button } from "$lib/components/ui/button";
  import CharacterCard from "$lib/components/CharacterCard.svelte";
  import type { PageData } from "./$types";
  import { getCardStatus, revalidateCard } from "../artifact-admin.remote";

  let { data }: { data: PageData } = $props();
  let copied = $state(false);
  let useWeb = $state(false);
  let ready = $state(false);
  let failed = $state("");
  let cached = $state(true);
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
    cached = false;
    try {
      if (!useWeb) await revalidateCard(data.sub.id);
      tick = Date.now();
      toast.success("กำลังโหลดรูปใหม่");
    } catch (error) {
      failed = `${error instanceof Error ? error.message : error}`;
      toast.error(failed);
    }
  }

  onMount(() => {
    void getCardStatus(data.sub.id)
      .then((status) => {
        cached = status.cached;
        if (!status.cached && status.error) failed = status.error;
      })
      .catch((error) => (failed = `${error instanceof Error ? error.message : error}`));
  });
</script>

<svelte:head>
  <title>{data.sub.name} · Artifact Admin</title>
</svelte:head>

  <div class="h-full p-2">
  <div class="flex h-full w-full flex-col gap-2">
  <section class="flex w-full justify-between gap-2">
    <article class="w-full rounded-md border bg-card/75 pb-1 shadow-sm backdrop-blur">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 class="text-2xl font-bold">
            {data.sub.queue ?? "ลัดคิว"}. {data.sub.name}
          </h1>
          <p class="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {data.sub.comment || "ไม่มีข้อความเพิ่มเติม"}
          </p>
        </div>
      </div>
      {#if data.sub.queue === null || data.sub.promoted}
        <div class="mt-4 rounded-md border border-yellow-400/70 bg-yellow-400/10 p-3 text-sm">
          <strong>{data.sub.queue === null ? "คิวโดเนท" : "คิวโปรโมต"}</strong>
          <p class="mt-1 text-muted-foreground">UID {data.sub.uid} · {data.sub.char || "ไม่ระบุตัวละคร"}</p>
        </div>
      {/if}
        <div class="mt-5 flex items-center gap-2 px-5">
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

    <aside class="flex items-center justify-center overflow-hidden rounded-md border bg-card/75 backdrop-blur">
      {#if data.char}
        <CharacterCard char={data.char} />
      {:else}
        <div class="flex aspect-square items-center justify-center rounded-md border text-sm text-muted-foreground">
          No character
        </div>
      {/if}
    </aside>
  </section>

  <section class="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-card/75 backdrop-blur">
    {#if data.config.enka}
      {#if !ready && !failed && (cached || useWeb)}
        <div class="absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-xl border bg-background/80 p-4 backdrop-blur">
          <ScanSearch class="size-8 animate-pulse" />
          <span>กำลังโหลดข้อมูล...</span>
        </div>
      {/if}
      {#if !ready && !failed && !cached && !useWeb}
        <div class="absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-xl border bg-background/90 p-4 text-center backdrop-blur">
          <SquircleDashed class="size-8 text-orange-500" />
          <span>ยังไม่ได้เตรียมการ์ดไว้ล่วงหน้า จะใช้เวลาสักพัก</span>
        </div>
      {/if}
      {#if failed}
        <div class="absolute top-1/2 left-1/2 z-10 flex max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-xl border border-destructive/50 bg-background/90 p-4 text-center text-destructive backdrop-blur">
          <OctagonAlert class="size-8" />{failed}
        </div>
      {/if}

      <div class="absolute bottom-2 left-2 z-20 flex gap-1">
        <Tooltip text={useWeb ? "สลับเป็นรูปภาพ" : "สลับเป็น Enka"}>
          <Button
            variant="outline"
            size="icon"
            onclick={() => {
              ready = false;
              failed = "";
              useWeb = !useWeb;
            }}
          ><ImageIcon class="size-4" /></Button>
        </Tooltip>
        <Tooltip text="โหลดรูปใหม่">
          <Button variant="outline" size="icon" onclick={refreshCard} disabled={!failed && !ready}>
            <RefreshCw class="size-4" />
          </Button>
        </Tooltip>
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
            cached = true;
            toast.success("โหลดการ์ดแล้ว");
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
</div>
