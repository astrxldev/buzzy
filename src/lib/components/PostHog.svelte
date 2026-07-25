<script lang="ts">
  import posthog from "posthog-js";
  import { onMount } from "svelte";

  let { token, apiHost, uiHost }: { token?: string; apiHost?: string; uiHost?: string } =
    $props();

  onMount(() => {
    if (!token) return;
    posthog.init(token, {
      api_host: apiHost,
      ui_host: uiHost,
      defaults: "2026-01-30",
      capture_exceptions: true,
    });
  });
</script>
