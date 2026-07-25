<script lang="ts">
  import CountWidget from "../CountWidget.svelte";
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
</script>

<CountWidget initial={data.display} topic="rubgram" />
