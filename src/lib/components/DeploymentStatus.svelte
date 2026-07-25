<script lang="ts">
  import { RefreshCw, WifiOff } from "lucide-svelte";
  import { onMount } from "svelte";

  let updateAvailable = $state(false);
  let reconnecting = $state(false);

  onMount(() => {
    let version = "";
    const source = new EventSource("/api/active");

    source.addEventListener("version", (event) => {
      const next = JSON.parse(event.data) as string;
      if (version && next !== version) updateAvailable = true;
      version = next;
    });
    source.onopen = () => (reconnecting = false);
    source.onerror = () => (reconnecting = true);

    return () => source.close();
  });
</script>

{#if updateAvailable || reconnecting}
  <div class="fixed right-3 bottom-3 z-[100] flex max-w-sm items-center gap-3 rounded-lg border bg-card/95 px-4 py-3 text-sm shadow-xl backdrop-blur">
    {#if updateAvailable}
      <RefreshCw class="size-4 shrink-0" />
      <span>มีอัปเดตใหม่พร้อมใช้งาน</span>
      <button class="font-medium text-primary underline underline-offset-4" onclick={() => location.reload()}>
        รีโหลด
      </button>
    {:else}
      <WifiOff class="size-4 shrink-0 animate-pulse" />
      <span>การเชื่อมต่อขัดข้อง กำลังเชื่อมต่อใหม่...</span>
    {/if}
  </div>
{/if}
