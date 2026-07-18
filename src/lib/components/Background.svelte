<script lang="ts">
  import { page } from "$app/state";
  import FadeImage from "./FadeImage.svelte";
  import Stars from "./Stars.svelte";

  const backgrounds = [
    ["/artifact", "/bgassets/buzzbg1-r2.webp", "/bgassets/buzzbg1-r2-mask.webp"],
    ["/rubgram", "/bgassets/buzzbg2-r1.webp", "/bgassets/buzzbg2-r1-mask.webp"],
    ["/donate", "/bgassets/buzzbg3-r1.webp", "/bgassets/buzzbg3-r1-mask.webp"],
    ["/tl", "/bgassets/buzzbg5-r1.webp", "/bgassets/buzzbg4-r1-mask.webp"],
    ["/guide", "/bgassets/buzzbg4-r1.webp", "/bgassets/buzzbg5-r1-mask.webp"],
    ["/admin", "/bgassets/buzzbg6-r1.webp", "/bgassets/buzzbg6-r1-mask.webp"],
    ["/", "/bg.webp", "/mask.webp"],
  ] as const;

  const selected = $derived(
    backgrounds.find(([prefix]) => page.url.pathname.startsWith(prefix)) ??
      backgrounds.at(-1)!,
  );
</script>

<FadeImage
  src={selected[1]}
  alt="Background"
  class="fixed top-0 left-0 z-[-1] h-fit min-h-dvh w-full object-cover opacity-40"
/>
<Stars mask={selected[2]} />
