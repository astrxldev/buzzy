<script lang="ts">
  import { ExternalLink } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Tierlist Versions</title>
</svelte:head>

<div class="grid gap-6 p-4">
  <h1 class="text-3xl font-bold">Tierlist Versions</h1>

  {#each data.types as type}
    <section class="grid gap-3">
      <div class="flex flex-wrap items-baseline gap-2">
        <h2 class="text-2xl font-semibold">{type.name}</h2>
        <span class="rounded border px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {type.id}
        </span>
        <span class="text-xs text-muted-foreground">{type.mode}</span>
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(min(15rem,100%),1fr))] gap-3">
        {#each type.versions as version}
          <article
            class={[
              "overflow-hidden rounded-xl border bg-card/70 shadow-sm backdrop-blur",
              version.hidden && "opacity-55",
            ]}
          >
            <div class="relative aspect-video bg-black/20">
              {#if version.image}
                <img class="h-full w-full object-cover" src={`/cdn/${version.image}`} alt={version.name} />
              {:else}
                <div class="flex h-full items-center justify-center text-3xl font-bold">
                  {version.name}
                </div>
              {/if}
            </div>
            <div class="flex items-center justify-between gap-2 p-3">
              <div class="min-w-0">
                <div class="truncate font-semibold">{version.name}</div>
                <div class="truncate font-mono text-xs text-muted-foreground">
                  {version.id} · order {version.order}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                href={`/tl/${type.id}/${version.id}/admin`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink class="size-4" />
              </Button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/each}
</div>
