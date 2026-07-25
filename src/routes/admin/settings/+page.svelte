<script lang="ts">
  import { FolderSync } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { untrack } from "svelte";
  import type { PageData } from "./$types";
  import { setEnka, syncAmber } from "../admin.remote";

  let { data }: { data: PageData } = $props();
  let enka = $state(untrack(() => data.globalSettings?.enka ?? false));
  let busy = $state<"enka" | "amber" | "">("");
  let message = $state("");
  let syncResult = $state("");

  async function toggle() {
    const next = !enka;
    busy = "enka";
    message = "";
    try {
      const result = await setEnka(next);
      enka = result.enka;
      message = `Enka is ${enka ? "enabled" : "disabled"}.`;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = "";
    }
  }

  async function sync() {
    busy = "amber";
    message = "Amber sync is running. This can take several minutes.";
    syncResult = "";
    try {
      const result = await syncAmber();
      syncResult = result.output;
      message = result.ok ? "Amber sync completed." : "Amber sync failed. See output below.";
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = "";
    }
  }
</script>

<svelte:head><title>Settings</title></svelte:head>

<div class="grid gap-4 p-2 md:grid-cols-3 md:pl-0">
  <Card.Card class="md:col-span-3">
    <Card.CardHeader><Card.CardTitle class="text-2xl">External services</Card.CardTitle><Card.CardDescription>Manage Enka availability and synchronize character metadata from Amber.</Card.CardDescription></Card.CardHeader>
    <Card.CardContent class="grid gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-label="Enable Enka character fetching"
          aria-checked={enka}
          disabled={!!busy}
          class={["relative h-6 w-11 rounded-full border transition-colors disabled:opacity-50", enka ? "bg-primary" : "bg-muted"]}
          onclick={toggle}
        ><span class={["absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform", enka ? "translate-x-5" : "translate-x-0.5"]}></span></button>
        <div><div class="font-medium">Enable Enka character fetching</div><div class="text-sm text-muted-foreground">Disable this while Enka Network is unavailable.</div></div>
      </div>
      <div><Button disabled={!!busy} onclick={sync}><FolderSync /> {busy === "amber" ? "Syncing..." : "Sync Amber"}</Button></div>
      {#if message}<p class="rounded-md border bg-muted/30 px-3 py-2 text-sm" aria-live="polite">{message}</p>{/if}
      {#if syncResult}<pre class="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs">{syncResult}</pre>{/if}
    </Card.CardContent>
  </Card.Card>

  <Card.Card>
    <Card.CardHeader><Card.CardTitle>Global</Card.CardTitle></Card.CardHeader>
    <Card.CardContent><dl class="grid gap-2 text-sm"><div class="flex justify-between"><dt class="text-muted-foreground">Enka</dt><dd>{enka ? "enabled" : "disabled"}</dd></div><div class="flex justify-between"><dt class="text-muted-foreground">Donate goal</dt><dd>{data.globalSettings?.donateGoal ?? "none"}</dd></div></dl></Card.CardContent>
  </Card.Card>
  <Card.Card>
    <Card.CardHeader><Card.CardTitle>Artifact</Card.CardTitle></Card.CardHeader>
    <Card.CardContent><dl class="grid gap-2 text-sm"><div class="flex justify-between"><dt class="text-muted-foreground">Locked</dt><dd>{data.artifactConfig.locked ? "yes" : "no"}</dd></div><div class="flex justify-between"><dt class="text-muted-foreground">Limit</dt><dd>{data.artifactConfig.limit < 0 ? "unlimited" : data.artifactConfig.limit}</dd></div></dl></Card.CardContent>
  </Card.Card>
  <Card.Card>
    <Card.CardHeader><Card.CardTitle>Rubgram</Card.CardTitle></Card.CardHeader>
    <Card.CardContent><dl class="grid gap-2 text-sm"><div class="flex justify-between"><dt class="text-muted-foreground">Locked</dt><dd>{data.rubgramConfig.locked ? "yes" : "no"}</dd></div><div class="flex justify-between"><dt class="text-muted-foreground">Limit</dt><dd>{data.rubgramConfig.limit < 0 ? "unlimited" : data.rubgramConfig.limit}</dd></div><div class="flex justify-between"><dt class="text-muted-foreground">Free queue</dt><dd>{data.rubgramConfig.free}</dd></div><div class="flex justify-between"><dt class="text-muted-foreground">All discount</dt><dd>{data.rubgramConfig.allDiscount}</dd></div></dl></Card.CardContent>
  </Card.Card>
</div>
