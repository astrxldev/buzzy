<script lang="ts">
  import { Compass, Loader2, Search, SearchX } from "lucide-svelte";
  import { resolve } from "$app/paths";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { cn, debounce } from "$lib/utils";
  import { searchGuides } from "./guide.remote";

  let list = $state(await searchGuides(""));
  let loading = $state(false);
  let search = $state("");

  const runSearch = debounce(async () => {
    loading = true;
    try {
      list = await searchGuides(search);
    } finally {
      loading = false;
    }
  }, 200);
</script>

<svelte:head>
  <title>ไกด์ตัวละคร</title>
  <meta name="description" content="ไกด์ปั้นตัวละครโดยเกนชินไม่ใช่เกมมือถือ" />
</svelte:head>

<div class="flex h-svh justify-center">
  <div class="flex w-full flex-col border xl:max-w-2/3">
    <div>
      <a
        href={resolve("/")}
        class="flex items-center gap-2 border-b p-3 leading-none font-semibold"
      >
        <Compass class="opacity-50" />
        ไกด์ตัวละคร
      </a>
    </div>
    <div class="p-4 pb-2">
      <div
        class="border-input bg-background flex h-10 w-full min-w-0 items-center rounded-md border px-3 shadow-xs"
      >
        <Input
          class="h-full grow rounded-none border-0 bg-transparent px-0 shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0"
          placeholder="ค้นหา..."
          bind:value={search}
          oninput={runSearch}
        />
        {#if loading}
          <Loader2 class="size-4 animate-spin" />
        {:else}
          <Search class="size-4" />
        {/if}
      </div>
    </div>
    <div
      class={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(min(300px,calc(100svw-2rem-2px)),1fr))] gap-4 overflow-auto p-4 transition-opacity",
        loading && "opacity-50",
      )}
    >
      {#if list.length === 0 && !loading}
        <div
          class="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground"
        >
          <SearchX class="mb-4 h-16 w-16 opacity-50" />
          <p class="text-2xl font-semibold">ไม่พบตัวละครที่ค้นหา</p>
          <p class="text-lg">ลองคำอื่นที่ความหมายใกล้เคียงกันดูนะ</p>
        </div>
      {:else}
        {#each list as card (card.id)}
          <a href={card.link} target="_blank" rel="noreferrer">
            <Card.Root class="rounded-sm bg-card/50 py-3 backdrop-blur-sm transition-colors hover:bg-border sm:rounded-xl sm:py-6">
              <Card.Header class="px-3 sm:px-6">
                <Card.Title>{card.name}</Card.Title>
                <div
                  class="relative mt-2 aspect-square w-full overflow-hidden rounded-sm border sm:rounded-lg"
                >
                  {#if card.image}
                    <FadeImage
                      src={`/cdn/${card.image}`}
                      alt={card.name}
                      class="absolute inset-0 h-full w-full object-cover"
                    />
                  {/if}
                </div>
              </Card.Header>
            </Card.Root>
          </a>
        {/each}
      {/if}
    </div>
  </div>
</div>
