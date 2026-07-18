<script lang="ts">
  import {
    BugPlay,
    ChevronsLeftRightEllipsis,
    Copy,
    Goal,
    Image as ImageIcon,
    MessageCircleWarning,
    Wallet,
  } from "lucide-svelte";
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import * as Table from "$lib/components/ui/table";
  import type { PageData } from "./$types";
  import {
    reloadWidget,
    resendPopup,
    resetGoal,
    testPopup,
  } from "./donate-admin.remote";

  let { data }: { data: PageData } = $props();
  let busy = $state("");
  let query = $state("");
  const latest = $derived(data.rows[0]);
  const rows = $derived(
    data.rows.filter((row) =>
      `${row.name} ${row.message ?? ""} ${row.uid ?? ""}`.toLowerCase().includes(query.toLowerCase()),
    ),
  );

  async function run(key: string, fn: () => Promise<unknown>) {
    busy = key;
    try {
      await fn();
      await invalidateAll();
    } finally {
      busy = "";
    }
  }

  onMount(() => {
    const source = new EventSource("/sse/donate");
    source.addEventListener("ping", () => void invalidateAll());
    source.addEventListener("update", () => void invalidateAll());
    source.addEventListener("refresh", () => void invalidateAll());
    return () => source.close();
  });
</script>

<svelte:head>
  <title>โดเนททั้งหมด</title>
</svelte:head>

<div class="mx-auto flex min-h-svh w-full max-w-[min(90rem,96vw)] flex-col gap-3 p-4">
  <header class="flex flex-wrap items-center justify-between gap-2">
    <div>
      <h1 class="flex items-center gap-2 text-3xl font-bold">
        <Wallet class="size-8" />
        โดเนททั้งหมด
      </h1>
      <p class="text-sm text-muted-foreground">
        รวมทั้งหมด {data.stats.total.toLocaleString()}฿ · วันนี้ {data.stats.today.toLocaleString()}฿
      </p>
    </div>
    <div class="flex flex-wrap gap-1">
      <Button variant="outline" disabled={!!busy} onclick={() => run("test", () => testPopup())}>
        <BugPlay class="size-4" /> Test popup
      </Button>
      <Button variant="outline" disabled={!!busy} onclick={() => run("reload", () => reloadWidget())}>
        <ChevronsLeftRightEllipsis class="size-4" /> Reload widgets
      </Button>
      <Button variant="outline" disabled={!!busy} onclick={() => run("goal", () => resetGoal())}>
        <Goal class="size-4" /> Reset goal
      </Button>
      <Button variant="outline" href="/donate/admin/moderator">Moderator</Button>
      <Button variant="outline" href="/admin">Admin</Button>
    </div>
  </header>

  <div class="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
    <Card.Card class="bg-card/70 backdrop-blur">
      <Card.CardHeader>
        <Card.CardTitle>Latest donation</Card.CardTitle>
        <Card.CardDescription>
          {latest ? new Date(latest.created).toLocaleString() : "No donation yet"}
        </Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent>
        {#if latest}
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="text-xl font-semibold">{latest.name}</div>
              <p class="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {latest.message || "ไม่มีข้อความ"}
              </p>
            </div>
            <div class="shrink-0 text-2xl font-bold">{latest.amount}฿</div>
          </div>
        {:else}
          <p class="text-muted-foreground">No donation yet.</p>
        {/if}
      </Card.CardContent>
    </Card.Card>

    <Card.Card class="bg-card/70 backdrop-blur">
      <Card.CardHeader>
        <Card.CardTitle>รวมวันนี้</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent class="text-4xl font-bold">
        {data.stats.today.toLocaleString()}฿
      </Card.CardContent>
    </Card.Card>

    <Card.Card class="bg-card/70 backdrop-blur">
      <Card.CardHeader>
        <Card.CardTitle>รวมทั้งหมด</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent class="text-4xl font-bold">
        {data.stats.total.toLocaleString()}฿
      </Card.CardContent>
    </Card.Card>
  </div>

  <div class="flex justify-end">
    <Input
      class="max-w-sm"
      type="search"
      bind:value={query}
      placeholder="Search donations..."
    />
  </div>

  <div class="min-h-0 overflow-auto rounded-xl border bg-card/70 backdrop-blur">
    <Table.Table>
      <Table.TableHeader>
        <Table.TableRow>
          <Table.TableHead>ชื่อ</Table.TableHead>
          <Table.TableHead>จำนวน</Table.TableHead>
          <Table.TableHead>ข้อความ</Table.TableHead>
          <Table.TableHead>Method</Table.TableHead>
          <Table.TableHead>Created</Table.TableHead>
          <Table.TableHead class="text-right">Actions</Table.TableHead>
        </Table.TableRow>
      </Table.TableHeader>
      <Table.TableBody>
        {#each rows as row}
          <Table.TableRow>
            <Table.TableCell class="font-medium">{row.name}</Table.TableCell>
            <Table.TableCell>{row.amount}฿</Table.TableCell>
            <Table.TableCell class="max-w-md truncate">{row.message || ""}</Table.TableCell>
            <Table.TableCell>
              <Badge variant="outline">{row.method}</Badge>
            </Table.TableCell>
            <Table.TableCell class="whitespace-nowrap text-muted-foreground">
              {new Date(row.created).toLocaleString()}
            </Table.TableCell>
            <Table.TableCell class="text-right">
              <div class="inline-flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={busy === row.id}
                  onclick={() => run(row.id, () => resendPopup(row.id))}
                  title="Resend popup"
                >
                  <MessageCircleWarning class="size-4" />
                </Button>
                {#if row.uid}
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onclick={() => navigator.clipboard.writeText(row.uid || "")}
                    title="Copy UID"
                  >
                    <Copy class="size-4" />
                  </Button>
                {/if}
                {#if row.hasImage}
                  <Button
                    variant="outline"
                    size="icon-sm"
                    href={`/api/donate-image/${row.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Open image"
                  >
                    <ImageIcon class="size-4" />
                  </Button>
                {/if}
              </div>
            </Table.TableCell>
          </Table.TableRow>
        {/each}
      </Table.TableBody>
    </Table.Table>
  </div>
</div>
