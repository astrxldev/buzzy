<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children?: Snippet } = $props();
</script>

<div
  class="blocker absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-background/75 p-6 text-center backdrop-blur-sm"
>
  {@render children?.()}
</div>
