<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Audit Log</title>
</svelte:head>

<div class="p-4">
  <h1 class="mb-4 text-3xl font-bold">Audit Log</h1>
  <div class="overflow-hidden rounded-xl border bg-card/70 backdrop-blur">
    <table class="w-full text-left text-sm">
      <thead class="border-b bg-muted/50 text-xs text-muted-foreground">
        <tr>
          <th class="p-2">Time</th>
          <th class="p-2">Author</th>
          <th class="p-2">Action</th>
          <th class="p-2">Details</th>
        </tr>
      </thead>
      <tbody>
        {#each data.logs as log}
          <tr class="border-b last:border-0">
            <td class="whitespace-nowrap p-2 text-muted-foreground">
              {new Date(log.time).toLocaleString()}
            </td>
            <td class="whitespace-nowrap p-2">{log.author || "Unknown"}</td>
            <td class="p-2">{log.text}</td>
            <td class="max-w-lg truncate p-2 font-mono text-xs text-muted-foreground">
              {log.details ? JSON.stringify(log.details) : ""}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="mt-2 text-xs text-muted-foreground">
    {data.users.length} admin/user records loaded for reference.
  </p>
</div>
