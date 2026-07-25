<script lang="ts">
  import { onMount } from "svelte";

  onMount(() => {
    let version = "";
    const source = new EventSource("/api/active");
    source.addEventListener("version", (event) => {
      const next = JSON.parse(event.data) as string;
      if (version && next !== version) location.reload();
      version = next;
    });
    return () => source.close();
  });
</script>
