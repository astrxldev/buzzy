<script lang="ts">
  import { ArrowRight } from "lucide-svelte";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>จัดเทียร์ลิสต์</title>
  <meta name="description" content="ระบบจัดเทียร์ลิสต์ตัวละครของคอนเทนต์เอนเกม" />
</svelte:head>

<div class="mx-2 flex min-h-full max-w-full flex-col justify-center gap-2">
  <div class="mb-2 text-center">
    <a href="/">
      <FadeImage
        src="/logos/tierlist.webp"
        alt="Tierlist"
        class="inline-block w-1/2 sm:w-96"
        width="200"
        height="100"
        fetchpriority="high"
      />
    </a>
  </div>
  {#each data.types as type}
    <section class="flex flex-col gap-1">
      <a href={`/tl/${type.id}`} class="w-fit text-4xl font-bold">
        <div class="flex items-center gap-2">
          <div class="rounded-md border bg-[#2228] px-2 py-1">
            {type.name}
            <span class="ml-2 text-sm text-muted-foreground">{type.mode}</span>
          </div>
          <Tooltip text="ดูเทียร์ลิสต์ของคอนเทนต์นี้ทั้งหมด">
            <span class="absolute right-0 m-8 ml-2 text-sm font-normal text-blue-400 hover:underline">
              ดูทั้งหมด
              <ArrowRight class="inline-block size-4" />
            </span>
          </Tooltip>
        </div>
      </a>
      <div class="overflow-x-auto">
        <div class="flex max-w-full gap-2 pb-2">
          {#each type.versions as version}
            <a href={`/tl/${type.id}/${version.id}`}>
              {#if version.image}
                <div class="relative aspect-video w-60 rounded-sm border">
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
                <div class="flex aspect-video w-60 items-center justify-center rounded-sm border bg-[#1118] text-4xl font-bold backdrop-blur-xl">
                  {version.name}
                </div>
              {/if}
            </a>
          {/each}
        </div>
      </div>
    </section>
  {/each}
</div>
