<script lang="ts">
  import { Gavel, ImageOff, RadioTower, RefreshCw } from "lucide-svelte";
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import type { PageData } from "./$types";
  import { rejectDonation, reloadWidget } from "../donate-admin.remote";

  let { data }: { data: PageData } = $props();
  let busy = $state("");
  let connected = $state(0);
  let heartbeat = 0;
  let player: HTMLAudioElement | null = $state(null);

  async function reject() {
    if (!data.latest) return;
    busy = "reject";
    try {
      await rejectDonation(data.latest.id);
      await reloadWidget();
      await invalidateAll();
    } finally {
      busy = "";
    }
  }

  onMount(() => {
    const source = new EventSource("/sse/donate");
    source.addEventListener("heartbeat", () => heartbeat++);
    source.addEventListener("ping", () => {
      void player?.play().catch(() => {});
      void invalidateAll();
    });
    source.addEventListener("update", () => void invalidateAll());
    const interval = window.setInterval(() => {
      connected = heartbeat;
      heartbeat = 0;
    }, 10000);
    return () => {
      source.close();
      window.clearInterval(interval);
    };
  });
</script>

<svelte:head>
  <title>Donate Moderator</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center p-4">
  <Card.Card class="dark w-full max-w-md bg-background text-foreground scheme-dark">
    <Card.CardHeader>
      <Card.CardTitle>Donate Moderator</Card.CardTitle>
      <Card.CardDescription>Latest donation preview and widget controls.</Card.CardDescription>
    </Card.CardHeader>
    <Card.CardContent class="grid gap-3">
      {#if data.latest?.hasImage}
        <div class="relative aspect-square overflow-hidden rounded-lg border bg-black/50">
          <img
            class="h-full w-full object-contain"
            src={`/api/donate-image/${data.latest.id}`}
            alt="Donation"
          />
        </div>
      {:else}
        <div class="flex aspect-square items-center justify-center rounded-lg border bg-black/50">
          <ImageOff class="size-16 opacity-20" />
        </div>
      {/if}

      {#if data.latest}
        <div class="flex justify-between gap-4">
          <div class="min-w-0">
            <div class="font-bold">{data.latest.name}</div>
            <p class="whitespace-pre-wrap text-sm text-muted-foreground">
              {data.latest.message || "ไม่มีข้อความ"}
            </p>
          </div>
          <div class="shrink-0 font-semibold">{data.latest.amount}฿</div>
        </div>
      {:else}
        <p class="text-muted-foreground">No donation yet.</p>
      {/if}

      <div class="flex flex-wrap justify-evenly gap-1">
        <Button variant="destructive" size="sm" disabled={busy === "reject" || !data.latest} onclick={reject}>
          <Gavel class="size-4" />
          Reject
        </Button>
        <Button variant="outline" size="sm" disabled={!!busy} onclick={() => reloadWidget()}>
          <RefreshCw class="size-4" />
          Reload Widgets
        </Button>
        <Button variant="outline" size="sm" disabled>
          <RadioTower class="size-4" />
          {connected}
        </Button>
      </div>
      <audio bind:this={player} src="/assets/donate-mod-sfx.wav" preload="auto"></audio>
    </Card.CardContent>
  </Card.Card>
</div>
