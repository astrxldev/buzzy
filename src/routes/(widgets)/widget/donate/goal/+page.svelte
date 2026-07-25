<script lang="ts">
  import { onMount } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import WidgetVersion from "../../WidgetVersion.svelte";
  import { getDonateBar } from "../widget.remote";

  const barQuery = getDonateBar();
  type Bar = NonNullable<typeof barQuery.current>;
  let bar = $state<Bar>();
  let text = $state<HTMLDivElement>();
  let stableSize: Record<string, number> = {};
  let fitTimer: number | undefined;
  const attachText: Attachment<HTMLDivElement> = (element) => {
    text = element;
  };
  const ratio = $derived(Math.min(1, Number(bar?.amount ?? 0) / (bar?.goal ?? 1)));

  function fit() {
    window.clearInterval(fitTimer);
    if (!text || !bar) return;
    const element = text;
    const key = `${bar.goal}`;
    if (stableSize[key]) {
      element.style.fontSize = `${stableSize[key]}px`;
      element.style.opacity = "1";
      return;
    }
    let fontSize = 48;
    let count = 0;
    element.style.opacity = "0";
    fitTimer = window.setInterval(() => {
      const parent = element.parentElement;
      if (!parent) return;
      fontSize = (fontSize * parent.clientHeight) / element.scrollHeight;
      element.style.fontSize = `${fontSize}px`;
      if (++count > 10) {
        stableSize[key] = fontSize;
        element.style.opacity = "1";
        window.clearInterval(fitTimer);
      }
    }, 100);
  }

  async function update(delayed = false) {
    await barQuery.refresh();
    if (delayed && text) await new Promise((resolve) => setTimeout(resolve, 10000));
    bar = barQuery.current;
    fit();
  }

  onMount(() => {
    const source = new EventSource("/sse/donate");
    source.addEventListener("update", () => void update(true));
    source.addEventListener("ping", () => void update(true));
    source.addEventListener("refresh", () => location.reload());
    const backup = window.setInterval(() => void update(), 300000);
    const resize = () => {
      stableSize = {};
      fit();
    };
    window.addEventListener("resize", resize);
    void barQuery.then((value) => {
      bar = value;
      queueMicrotask(fit);
    });
    return () => {
      source.close();
      window.clearInterval(backup);
      window.clearInterval(fitTimer);
      window.removeEventListener("resize", resize);
    };
  });
</script>

{#if bar}
  <div class="relative h-full max-h-[20svw] w-full overflow-hidden rounded-full bg-[#252525]">
    <div class="absolute inset-2 rounded-full bg-black"></div>
    <div
      class="goal-fill absolute inset-1.5 rounded-full bg-linear-to-b from-[#FD0000] to-[#830000]"
      style:width={`calc(${ratio * 100}% - ${ratio * 12}px)`}
    ></div>
    <div
      {@attach attachText}
      class="absolute top-1/2 right-8 -translate-y-1/2 pb-1 font-bold opacity-0 transition-opacity"
    >
      {bar.goal}฿
    </div>
  </div>
{/if}
<WidgetVersion />

<style>
  .goal-fill {
    transition: width 0.3s ease;
  }
</style>
