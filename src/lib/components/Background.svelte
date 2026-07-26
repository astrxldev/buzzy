<script lang="ts">
  import { page } from "$app/state";
  import Stars from "./Stars.svelte";

  const backgrounds = [
    ["/artifact", "/bgassets/buzzbg1-r2.webp", "/bgassets/buzzbg1-r2-mask.webp"],
    ["/rubgram", "/bgassets/buzzbg2-r1.webp", "/bgassets/buzzbg2-r1-mask.webp"],
    ["/donate", "/bgassets/buzzbg3-r1.webp", "/bgassets/buzzbg3-r1-mask.webp"],
    ["/tl", "/bgassets/buzzbg5-r1.webp", "/bgassets/buzzbg4-r1-mask.webp"],
    ["/guide", "/bgassets/buzzbg4-r1.webp", "/bgassets/buzzbg5-r1-mask.webp"],
    ["/admin", "/bgassets/buzzbg6-r1.webp", "/bgassets/buzzbg6-r1-mask.webp"],
    ["/donate", "/bgassets/buzzbg7-r1.webp", "/bgassets/buzzbg7-r1-mask.webp"],
    ["/", "/bg.webp", "/mask.webp"],
  ] as const;

  const selected = $derived(
    backgrounds.find(([prefix]) => page.url.pathname.startsWith(prefix)) ??
      backgrounds.at(-1)!,
  );
  let transitioning = $state(false);
  let current = $state<string>();
  let currentImage = $derived(current ?? selected[1]);
</script>

<img
  src={selected[1]}
  alt="Background Swap"
  class:opacity-40={transitioning}
  class="fixed top-0 left-0 z-[-1] h-fit min-h-dvh w-full object-cover opacity-0"
  class:transition-opacity={transitioning}
  class:duration-500={transitioning}
  onload={() => {
    if (selected[1] !== currentImage) transitioning = true;
  }}
  ontransitionend={() => {
    if (transitioning) {
      current = selected[1];
      transitioning = false;
    }
  }}
/>
<img
  src={currentImage}
  alt="Background Current"
  class:opacity-0={transitioning}
  class="fixed top-0 left-0 z-[-1] h-fit min-h-dvh w-full object-cover opacity-40"
  class:transition-opacity={transitioning}
  class:duration-500={transitioning}
  draggable="false"
/>
{#if !transitioning}
  <Stars mask={selected[2]} />
{/if}
