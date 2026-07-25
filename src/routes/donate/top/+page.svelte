<script lang="ts">
  import { Award, FolderCode, Trophy } from "lucide-svelte";
  import { resolve } from "$app/paths";
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const order = $derived([data.podium[1], data.podium[0], data.podium[2]].filter(Boolean));
  const styles = [
    { border: "border-yellow-500/50", bg: "bg-yellow-500/5", height: "h-48", text: "text-yellow-600" },
    { border: "border-zinc-400/50", bg: "bg-zinc-400/5", height: "h-36", text: "text-zinc-500" },
    { border: "border-amber-700/50", bg: "bg-amber-700/5", height: "h-32", text: "text-amber-700" },
  ];
</script>

<svelte:head>
  <title>โดเนทขึ้นจอ</title>
  <meta name="description" content="ท็อป 10 อันดับคนโดเนท" />
</svelte:head>

<div class="flex min-h-svh flex-col justify-center">
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
    <div class="mt-6 flex items-end justify-center gap-4">
      {#each order as donor, index (donor.name)}
        {@const rank = index === 0 ? 1 : index === 1 ? 0 : 2}
        {@const style = styles[rank]}
        <div class="relative flex flex-col items-center">
          <div class="absolute -top-8 z-10">
            {#if rank === 0}
              <Trophy size={28} class="text-yellow-500" />
            {:else}
              <Award size={28} class={style.text} />
            {/if}
          </div>
          <Card.Root class={`${style.border} ${style.bg} ${style.height} flex w-36 flex-col items-center justify-end pb-0 backdrop-blur-md`}>
            <Card.Content class="flex w-full flex-col items-center gap-2 p-4">
              <div class="flex size-10 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold">
                {#if donor.image}
                  <img src={donor.image} alt="" class="size-full object-cover" />
                {:else}
                  {donor.name?.charAt(0).toUpperCase() ?? "?"}
                {/if}
              </div>
              <span class="w-full truncate text-center text-sm font-semibold">{donor.name}</span>
              <span class={`text-lg font-bold ${style.text}`}>{donor.amount}฿</span>
            </Card.Content>
          </Card.Root>
        </div>
      {/each}
    </div>

    <div class="max-h-[calc(100svh-264px)] w-full overflow-y-auto rounded-xl border bg-card/70 backdrop-blur-md">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-12 text-center">#</Table.Head>
            <Table.Head class="w-full">Name</Table.Head>
            <Table.Head class="w-24">Amount</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each data.list as donor (donor.name)}
            <Table.Row>
              <Table.Cell class="text-center">{donor.i}</Table.Cell>
              <Table.Cell class="max-w-0 truncate">{donor.name}</Table.Cell>
              <Table.Cell>{donor.amount}฿</Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell colspan={3} class="h-48 text-center">
                <div class="flex flex-col items-center gap-3 py-4">
                  <div class="rounded-lg border bg-muted p-2 text-muted-foreground">
                    <FolderCode class="size-6" />
                  </div>
                  <div>
                    <p class="font-semibold">Nothing Yet</p>
                    <p class="text-sm text-muted-foreground">ยังไม่มีโดเนท</p>
                  </div>
                  <a href={resolve("/donate")} class="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Home</a>
                </div>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </div>
</div>
