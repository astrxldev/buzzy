<script lang="ts">
  import { Eye, EyeOff, ExternalLink } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import type { PageData } from "./$types";
  import { toggleGuide } from "../admin.remote";

  let { data }: { data: PageData } = $props();
  let busy = $state("");

  async function toggle(id: string) {
    busy = id;
    try {
      await toggleGuide(id);
      await invalidateAll();
    } finally {
      busy = "";
    }
  }
</script>

<svelte:head>
  <title>Guides</title>
</svelte:head>

<div class="p-4">
  <h1 class="mb-4 text-3xl font-bold">Guides</h1>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-4">
    {#each data.guides as guide}
      <article
        class={[
          "group overflow-hidden rounded-xl border bg-card/70 shadow-sm backdrop-blur transition-opacity",
          guide.hidden && "opacity-60",
        ]}
      >
        <div class="relative aspect-square bg-black/20">
          {#if guide.image}
            <img class="h-full w-full object-cover" src={`/cdn/${guide.image}`} alt={guide.name} />
          {/if}
          <div class="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
            <Button
              variant="outline"
              size="icon"
              disabled={busy === guide.id}
              onclick={() => toggle(guide.id)}
            >
              {#if guide.hidden}
                <EyeOff class="size-4" />
              {:else}
                <Eye class="size-4" />
              {/if}
            </Button>
            <Button variant="outline" size="icon" href={guide.link} target="_blank" rel="noreferrer">
              <ExternalLink class="size-4" />
            </Button>
          </div>
        </div>
        <div class="p-4">
          <div class="text-lg font-semibold">{guide.name}</div>
          <div class="mt-1 truncate font-mono text-xs text-muted-foreground">
            {guide.id}
          </div>
        </div>
      </article>
    {/each}
  </div>
</div>
