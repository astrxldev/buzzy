<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let query = $state("");
  const chars = $derived(
    data.chars.filter((char) =>
      `${char.name} ${char.amber} ${char.version}`.toLowerCase().includes(query.toLowerCase()),
    ),
  );
</script>

<svelte:head>
  <title>Characters</title>
</svelte:head>

<div class="p-4">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
    <h1 class="text-3xl font-bold">Characters</h1>
    <Input
      class="max-w-sm"
      type="search"
      bind:value={query}
      placeholder="Search character..."
    />
  </div>

  <div class="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
    {#each chars as char}
      <article class="overflow-hidden rounded-xl border bg-card/70 shadow-sm backdrop-blur">
        <div class="aspect-square bg-black/20">
          <img class="h-full w-full object-cover" src={`/cdn/${char.image}`} alt={char.name} />
        </div>
        <div class="p-3">
          <div class="truncate font-semibold">{char.name}</div>
          <div class="text-xs text-muted-foreground">
            {char.stars}★ · {char.vision} · {char.weapon}
          </div>
          <div class="mt-1 truncate font-mono text-[10px] text-muted-foreground">
            {char.version} · {char.amber}
          </div>
        </div>
      </article>
    {/each}
  </div>
</div>
