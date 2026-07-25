<script lang="ts">
  import { onMount } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import WidgetVersion from "../../WidgetVersion.svelte";
  import { getTopDonate } from "../widget.remote";

  const topQuery = getTopDonate();
  type Top = NonNullable<typeof topQuery.current>;
  let top = $state<Top>();
  let text = $state<HTMLDivElement>();
  let stableSize: Record<string, number> = {};
  let fitTimer: number | undefined;
  const attachText: Attachment<HTMLDivElement> = (element) => {
    text = element;
  };

  function fit() {
    window.clearInterval(fitTimer);
    if (!text || !top) return;
    const element = text;
    const key = `${top.name}${top.amount}`;
    if (stableSize[key]) {
      element.style.fontSize = `${stableSize[key]}px`;
      return;
    }
    let fontSize = 48;
    let count = 0;
    fitTimer = window.setInterval(() => {
      fontSize = (fontSize * element.clientWidth) / element.scrollWidth;
      element.style.fontSize = `${fontSize}px`;
      if (++count > 20) {
        stableSize[key] = fontSize;
        window.clearInterval(fitTimer);
      }
    }, 100);
  }

  async function update() {
    await topQuery.refresh();
    top = topQuery.current;
    fit();
  }

  onMount(() => {
    const source = new EventSource("/sse/donate");
    source.addEventListener("update", () => void update());
    source.addEventListener("ping", () => void update());
    source.addEventListener("refresh", () => location.reload());
    const backup = window.setInterval(() => void update(), 300000);
    const resize = () => {
      stableSize = {};
      fit();
    };
    window.addEventListener("resize", resize);
    void topQuery.then((value) => {
      top = value;
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

{#if top}
  <div class="grid h-full w-full grid-cols-[40px_minmax(0,1fr)_max-content] gap-1 rounded-full border-4 border-black bg-black/75 p-2 px-3 text-5xl font-semibold text-[#FFBA00] *:self-center">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="size-10 shrink-0" aria-hidden="true">
      <path d="M200-160v-80h560v80H200Zm0-140-51-321q-2 0-4.5.5t-4.5.5q-25 0-42.5-17.5T80-680q0-25 17.5-42.5T140-740q25 0 42.5 17.5T200-680q0 7-1.5 13t-3.5 11l125 56 125-171q-11-8-18-21t-7-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820q0 15-7 28t-18 21l125 171 125-56q-2-5-3.5-11t-1.5-13q0-25 17.5-42.5T820-740q25 0 42.5 17.5T880-680q0 25-17.5 42.5T820-620q-2 0-4.5-.5t-4.5-.5l-51 321H200Zm68-80h424l26-167-105 46-133-183-133 183-105-46 26 167Zm212 0Z"></path>
    </svg>
    <div {@attach attachText} class="min-w-0 text-nowrap">{top.name}</div>
    <div class="text-white">{top.amount}฿</div>
  </div>
{/if}
<WidgetVersion />
