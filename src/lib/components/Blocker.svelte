<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { CircleX } from "lucide-svelte";
  import { cn } from "$lib/utils";

  let {
    children,
    fail = false,
    inner = false,
    class: className,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & {
    children?: Snippet;
    inner?: boolean;
    fail?: boolean;
  } = $props();
</script>

<div
  class={cn(
    "blocker absolute -top-1.25 -right-1.25 -bottom-1.25 -left-1.25 z-45 flex items-center justify-center rounded-sm border border-t-gray-700 border-l-gray-600 bg-[#2225] backdrop-blur-sm",
    inner && "top-0 right-0 bottom-0 left-0 rounded-none",
    className,
  )}
  {...restProps}
>
  {#if fail}
    <div class="flex items-center gap-2 rounded border bg-[#2222] p-2">
      <CircleX size={24} class="text-red-400" />
      <div>{@render children?.()}</div>
    </div>
  {:else}
    {@render children?.()}
  {/if}
</div>
