<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import WidgetVersion from "./WidgetVersion.svelte";
  import { getWidgetCount } from "./widget.remote";

  let {
    initial,
    topic,
  }: { initial: string; topic: "artifact" | "rubgram" } = $props();
  let display = $state(untrack(() => initial));
  const countQuery = untrack(() => getWidgetCount(topic));
  let container: HTMLDivElement;
  let text: HTMLDivElement;
  const attachContainer: Attachment<HTMLDivElement> = (element) => {
    container = element;
  };
  const attachText: Attachment<HTMLDivElement> = (element) => {
    text = element;
  };

  function fit() {
    if (!container || !text) return;
    let low = 1;
    let high = Math.max(container.clientHeight * 2, 16);
    for (let i = 0; i < 12; i++) {
      const size = (low + high) / 2;
      text.style.fontSize = `${size}px`;
      if (text.scrollWidth <= container.clientWidth && text.scrollHeight <= container.clientHeight) low = size;
      else high = size;
    }
    text.style.fontSize = `${low}px`;
  }

  async function update() {
    await countQuery.refresh();
    display = countQuery.current ?? display;
    requestAnimationFrame(fit);
  }

  onMount(() => {
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    const source = new EventSource(`/sse/${topic}`);
    source.addEventListener("update", () => void update());
    fit();
    return () => {
      observer.disconnect();
      source.close();
    };
  });
</script>

<div {@attach attachContainer} class="count flex size-full items-center justify-center font-medium">
  <div {@attach attachText} class="whitespace-nowrap leading-none">{display}</div>
</div>
<WidgetVersion />

<style>
  .count {
    font-family: "Kanit Local", "Kanit", sans-serif;
  }
</style>
