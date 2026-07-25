<script lang="ts">
  import { ChevronDown, ChevronRight, FileText } from "lucide-svelte";
  import { onMount, untrack } from "svelte";
  import { Input } from "$lib/components/ui/input";
  import type { PageData } from "./$types";

  type Log = PageData["logs"][number];
  let { data }: { data: PageData } = $props();
  let logs = $state<Log[]>(untrack(() => [...data.logs]));
  let query = $state("");
  let author = $state("");
  let category = $state("");
  let expanded = $state<string[]>([]);
  let container: HTMLDivElement;

  const categories = ["artifact", "tierlist", "rubgram", "character", "guide", "file", "cdn", "settings"];
  const filtered = $derived(
    logs.filter((log) => {
      const serialized = `${log.author ?? ""} ${log.text} ${log.details ? JSON.stringify(log.details) : ""}`.toLowerCase();
      return (!author || log.author === author) && (!category || serialized.includes(category)) && serialized.includes(query.toLowerCase());
    }),
  );

  function toggle(id: string) {
    expanded = expanded.includes(id) ? expanded.filter((value) => value !== id) : [...expanded, id];
  }

  function grouped(log: Log, previous?: Log) {
    return !!previous && log.author === previous.author && Math.abs(new Date(log.time).getTime() - new Date(previous.time).getTime()) < 300_000;
  }

  function formatTime(value: Date | string) {
    return new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  }

  function formatDate(value: Date | string) {
    return new Date(value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", timeZone: "Asia/Bangkok" });
  }

  onMount(() => {
    container = document.querySelector<HTMLDivElement>("#admin-log-container")!;
    container.scrollTop = container.scrollHeight;
    const source = new EventSource("/sse/log");
    source.addEventListener("update", (event) => {
      const follow = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      const entry = JSON.parse(event.data) as Log;
      if (!logs.some((log) => log.id === entry.id)) logs = [...logs.slice(-999), entry];
      if (follow) requestAnimationFrame(() => (container.scrollTop = container.scrollHeight));
    });
    return () => source.close();
  });
</script>

<svelte:head><title>Audit Log</title></svelte:head>

<div class="flex h-svh w-full flex-col gap-2 overflow-hidden bg-[#2225] p-2 md:pl-0">
  <div class="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_12rem_10rem]">
    <Input type="search" bind:value={query} class="bg-input" placeholder="Search audit log..." />
    <select class="h-8 rounded-lg border bg-input px-2 text-sm" bind:value={author} aria-label="Filter author"><option value="">All authors</option>{#each data.users as user (user.email)}<option value={user.name}>{user.email}</option>{/each}</select>
    <select class="h-8 rounded-lg border bg-input px-2 text-sm" bind:value={category} aria-label="Filter category"><option value="">All categories</option>{#each categories as value (value)}<option value={value}>{value}</option>{/each}</select>
  </div>
  <div id="admin-log-container" class="min-h-0 flex-1 overflow-auto">
    {#each filtered as log, index (log.id)}
      {@const isGrouped = grouped(log, filtered[index - 1])}
      {@const isExpanded = expanded.includes(log.id)}
      <article class="group transition-colors hover:bg-[#2225]">
        <div class={["flex gap-3 px-2 sm:px-4", isGrouped ? "py-0.5" : "pt-3.5 pb-0.5"]}>
          <div class="hidden w-16 shrink-0 pt-0.5 text-right text-xs sm:block"><span class={isGrouped ? "invisible group-hover:visible" : "invisible"}>{formatTime(log.time)}</span></div>
          <div class="min-w-0 flex-1">
            {#if !isGrouped}<div class="mb-0.5 flex flex-wrap items-baseline gap-2"><span class="font-semibold">{log.author || "System"}</span><span class="text-xs text-muted-foreground">{formatDate(log.time)} {formatTime(log.time)}</span></div>{/if}
            <button type="button" class="flex w-full items-start justify-between gap-2 text-left" onclick={() => log.details && toggle(log.id)}>
              <span class="flex items-center gap-2 leading-relaxed text-muted-foreground">{log.text}{#if !isExpanded && log.details}<FileText class="size-4" />{/if}</span>
              {#if log.details}{#if isExpanded}<ChevronDown class="size-4 shrink-0" />{:else}<ChevronRight class="size-4 shrink-0" />{/if}{/if}
            </button>
            {#if isExpanded && log.details}<pre class="my-2 overflow-x-auto whitespace-pre-wrap rounded border bg-muted/30 p-3 font-mono text-xs">{JSON.stringify(log.details, null, 2)}</pre>{/if}
          </div>
        </div>
      </article>
    {:else}
      <p class="p-8 text-center text-muted-foreground">No matching audit entries.</p>
    {/each}
  </div>
</div>
