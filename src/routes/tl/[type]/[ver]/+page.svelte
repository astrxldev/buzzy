<script lang="ts">
  import TierList from "$lib/components/tierlist/TierList.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>จัดเทียร์ลิสต์ {data.type.name} {data.version.name}</title>
</svelte:head>

<TierList {...data} />
