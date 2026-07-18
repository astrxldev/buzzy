<script lang="ts">
  import { cn } from "$lib/utils";

  let {
    src,
    alt = "",
    class: className = "",
    ...rest
  }: {
    src: string;
    alt?: string;
    class?: string;
    [key: string]: unknown;
  } = $props();

  let loaded = $state(false);
</script>

<img
  {src}
  {alt}
  class={cn(
    "opacity-0 transition-opacity duration-600",
    loaded && "opacity-100",
    className,
  )}
  onload={() => (loaded = true)}
  draggable="false"
  {...rest}
/>
