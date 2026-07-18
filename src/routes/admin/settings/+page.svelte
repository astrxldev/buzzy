<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<div class="grid gap-4 p-4 md:grid-cols-3">
  <section class="rounded-xl border bg-card/70 p-5 shadow-sm backdrop-blur">
    <h1 class="text-2xl font-bold">Global</h1>
    <dl class="mt-4 grid gap-2 text-sm">
      <div class="flex justify-between gap-2">
        <dt class="text-muted-foreground">Enka</dt>
        <dd>{data.globalSettings?.enka ? "enabled" : "disabled"}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt class="text-muted-foreground">Donate goal</dt>
        <dd>{data.globalSettings?.donateGoal ?? "none"}</dd>
      </div>
    </dl>
  </section>

  <section class="rounded-xl border bg-card/70 p-5 shadow-sm backdrop-blur">
    <h2 class="text-2xl font-bold">Artifact</h2>
    <dl class="mt-4 grid gap-2 text-sm">
      <div class="flex justify-between gap-2">
        <dt class="text-muted-foreground">Locked</dt>
        <dd>{data.artifactConfig.locked ? "yes" : "no"}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt class="text-muted-foreground">Limit</dt>
        <dd>{data.artifactConfig.limit < 0 ? "unlimited" : data.artifactConfig.limit}</dd>
      </div>
    </dl>
  </section>

  <section class="rounded-xl border bg-card/70 p-5 shadow-sm backdrop-blur">
    <h2 class="text-2xl font-bold">Rubgram</h2>
    <dl class="mt-4 grid gap-2 text-sm">
      <div class="flex justify-between gap-2">
        <dt class="text-muted-foreground">Locked</dt>
        <dd>{data.rubgramConfig.locked ? "yes" : "no"}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt class="text-muted-foreground">Limit</dt>
        <dd>{data.rubgramConfig.limit < 0 ? "unlimited" : data.rubgramConfig.limit}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt class="text-muted-foreground">Free queue</dt>
        <dd>{data.rubgramConfig.free}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt class="text-muted-foreground">All discount</dt>
        <dd>{data.rubgramConfig.allDiscount}</dd>
      </div>
    </dl>
  </section>
</div>
