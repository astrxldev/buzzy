<script lang="ts">
  import { ExternalLink } from "lucide-svelte";
  import { Input } from "$lib/components/ui/input";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let query = $state("");
  const files = $derived(
    data.files.filter((file) =>
      `${file.name ?? ""} ${file.id} ${file.type}`.toLowerCase().includes(query.toLowerCase()),
    ),
  );
</script>

<svelte:head>
  <title>CDN</title>
</svelte:head>

<div class="p-4">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
    <h1 class="text-3xl font-bold">CDN</h1>
    <Input
      class="max-w-sm"
      type="search"
      bind:value={query}
      placeholder="Search files..."
    />
  </div>

  <div class="overflow-hidden rounded-xl border bg-card/70 backdrop-blur">
    <table class="w-full text-left text-sm">
      <thead class="border-b bg-muted/50 text-xs text-muted-foreground">
        <tr>
          <th class="p-2">Name</th>
          <th class="p-2">Type</th>
          <th class="p-2">Size</th>
          <th class="p-2">ID</th>
          <th class="p-2"></th>
        </tr>
      </thead>
      <tbody>
        {#each files as file}
          <tr class="border-b last:border-0">
            <td class="max-w-xs truncate p-2">{file.name || "Unnamed"}</td>
            <td class="whitespace-nowrap p-2 text-muted-foreground">{file.type}</td>
            <td class="whitespace-nowrap p-2">{file.size}</td>
            <td class="max-w-xs truncate p-2 font-mono text-xs text-muted-foreground">{file.id}</td>
            <td class="p-2 text-right">
              <a class="inline-flex rounded-md border p-2 hover:bg-accent" href={`/cdn/${file.id}`} target="_blank" rel="noreferrer">
                <ExternalLink class="size-4" />
              </a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
