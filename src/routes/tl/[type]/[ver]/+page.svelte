<script lang="ts">
  import { page } from "$app/state";
  import TierList from "$lib/components/tierlist/TierList.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>จัดเทียร์ลิสต์ {data.type.name} {data.version.name}</title>
  <meta
    name="description"
    content={`จัดเทียร์ลิสต์ ${data.type.name} ${data.version.name}`}
  />
  <meta property="og:title" content={`จัดเทียร์ลิสต์ ${data.type.name} ${data.version.name}`} />
  <meta property="og:description" content={`จัดเทียร์ลิสต์ ${data.type.name} ${data.version.name}`} />
  {#if data.version.image}
    <meta property="og:image" content={data.version.image.startsWith("http") ? data.version.image : `${page.url.origin}/cdn/${data.version.image}`} />
    <meta name="twitter:image" content={data.version.image.startsWith("http") ? data.version.image : `${page.url.origin}/cdn/${data.version.image}`} />
  {/if}
</svelte:head>

<TierList {...data} />
