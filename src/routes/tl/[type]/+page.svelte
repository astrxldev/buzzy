<script lang="ts">
  import { ArrowLeft } from "lucide-svelte";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>จัดเทียร์ลิสต์ {data.type.name}</title>
</svelte:head>

<div class="mx-auto flex min-h-full max-w-7xl flex-col gap-6 px-4 py-8">
  <section class="flex flex-col gap-1">
    <a href="/tl" class="flex cursor-default text-muted-foreground hover:underline">
      <ArrowLeft /> กลับไปหน้าแรก
    </a>
    <div class="text-4xl font-bold">
      <div class="w-fit rounded-md border bg-[#2228] px-2 py-1">
        {data.type.name}
        <span class="ml-2 text-sm text-muted-foreground">{data.type.mode}</span>
      </div>
    </div>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each data.type.versions as version}
        <a href={`/tl/${data.type.id}/${version.id}`}>
          {#if version.image}
            <div class="relative aspect-video w-full overflow-hidden rounded-lg border">
              <FadeImage
                src={`/cdn/${version.image}`}
                alt={version.name}
                class="h-full w-full rounded-sm border bg-primary object-cover"
              />
              <div class="absolute bottom-0 flex w-full justify-center rounded-b-sm bg-black/50 py-1">
                {version.name}
              </div>
            </div>
          {:else}
            <div class="flex aspect-video items-center justify-center rounded-sm border bg-[#1118] text-5xl font-bold backdrop-blur-xl">
              {version.name}
            </div>
          {/if}
        </a>
      {/each}
    </div>
  </section>
</div>
