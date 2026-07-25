<script lang="ts">
  import { Activity } from "lucide-svelte";
  import { onMount } from "svelte";

  type Health = Record<string, boolean>;
  let health = $state<Health | null>(null);

  onMount(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await fetch("/api/health");
        const value = (await response.json()) as Health;
        if (active) health = response.ok ? value : {};
      } catch {
        if (active) health = {};
      }
    };
    void check();
    const interval = window.setInterval(check, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  });

  const healthy = $derived(health !== null && Object.values(health).every(Boolean));
  const label = $derived(
    health === null
      ? "Checking system health"
      : healthy
        ? "All systems operational"
        : `Unhealthy: ${Object.entries(health)
            .filter(([, ok]) => !ok)
            .map(([name]) => name)
            .join(", ") || "health endpoint"}`,
  );
</script>

<div class="flex items-center gap-2" title={label} aria-label={label}>
  <span
    class={[
      "size-2 rounded-full",
      health === null ? "animate-pulse bg-amber-400" : healthy ? "bg-emerald-400" : "bg-red-500",
    ]}
  ></span>
  <Activity class="size-3.5" />
  <span>{health === null ? "Checking health" : healthy ? "Systems operational" : "System degraded"}</span>
</div>
