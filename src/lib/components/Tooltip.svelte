<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    Tooltip as ShadTooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";

  let {
    text,
    side = "top",
    children,
  }: {
    text: string;
    side?: "top" | "bottom" | "left" | "right";
    children?: Snippet;
  } = $props();
</script>

<TooltipProvider>
  <ShadTooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        <span {...props} class="inline-flex">
          {@render children?.()}
        </span>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent {side} sideOffset={6}>
      {text}
    </TooltipContent>
  </ShadTooltip>
</TooltipProvider>
