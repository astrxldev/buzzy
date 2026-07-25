<script lang="ts">
  import {
    BugPlay,
    ChevronsLeftRightEllipsis,
    Copy,
    CircleAlert,
    CircleCheck,
    Goal,
    Image as ImageIcon,
    MessageCircleWarning,
    QrCode,
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
  let now = $state(Date.now());
  let feedback = $state<{ ok: boolean; text: string } | null>(null);
  const latest = $derived(data.rows[0]);
  const rows = $derived(
    data.rows.filter((row) =>
      `${row.name} ${row.message ?? ""} ${row.uid ?? ""}`.toLowerCase().includes(query.toLowerCase()),
    ),
  );

  function relativeTime(value: string | Date) {
    const seconds = Math.round((new Date(value).getTime() - now) / 1000);
    const formatter = new Intl.RelativeTimeFormat("th", { numeric: "auto" });
    if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
    return formatter.format(Math.round(hours / 24), "day");
  }

  async function run(key: string, label: string, fn: () => Promise<unknown>) {
    busy = key;
    feedback = null;
    try {
      await fn();
      await invalidateAll();
      feedback = { ok: true, text: `${label} สำเร็จ` };
    } catch (error) {
      feedback = { ok: false, text: error instanceof Error ? error.message : `${error}` };
    } finally {
      busy = "";
    }
  }

  onMount(() => {
    const source = new EventSource("/sse/donate");
    source.addEventListener("ping", () => void invalidateAll());
    source.addEventListener("update", () => void invalidateAll());
    source.addEventListener("refresh", () => void invalidateAll());
    const interval = window.setInterval(() => (now = Date.now()), 1000);
    return () => {
      source.close();
      window.clearInterval(interval);
    };
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
      <Button variant="outline" disabled={!!busy} onclick={() => run("test", "ส่ง test popup", () => testPopup())}>
        <BugPlay class="size-4" /> Test popup
      </Button>
      <Button variant="outline" disabled={!!busy} onclick={() => run("reload", "รีโหลด widgets", () => reloadWidget())}>
        <ChevronsLeftRightEllipsis class="size-4" /> Reload widgets
      </Button>
      <Button variant="outline" disabled={!!busy} onclick={() => run("goal", "รีเซ็ต goal", () => resetGoal())}>
        <Goal class="size-4" /> Reset goal
      </Button>
      <Button variant="outline" href="/donate/admin/moderator">Moderator</Button>
      <Button variant="outline" href="/admin">Admin</Button>
    </div>
  </header>

  {#if feedback}
    <div class={["flex items-center gap-2 rounded-md border p-2 text-sm", feedback.ok ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-destructive/50 bg-destructive/10 text-destructive"]}>
      {#if feedback.ok}<CircleCheck class="size-4" />{:else}<CircleAlert class="size-4" />{/if}
      {feedback.text}
    </div>
  {/if}

  <div class="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
    <Card.Card class="bg-card/70 backdrop-blur">
      <Card.CardHeader>
        <Card.CardTitle>Latest donation</Card.CardTitle>
        <Card.CardDescription>
          {latest ? `${relativeTime(latest.created)} · ${new Date(latest.created).toLocaleString("th-TH")}` : "No donation yet"}
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
        {#each rows as row (row.id)}
          <Table.TableRow>
            <Table.TableCell class="font-medium">{row.name}</Table.TableCell>
            <Table.TableCell>{row.amount}฿</Table.TableCell>
            <Table.TableCell class="max-w-md truncate">{row.message || ""}</Table.TableCell>
            <Table.TableCell>
              <Badge variant="outline" class="gap-1">
                {#if row.method === "pp"}
                  <QrCode class="size-3.5" /> PromptPay
                {:else}
                  <img src="/assets/tmn.webp" alt="" class="h-4 w-7 object-cover grayscale" /> TrueMoney
                {/if}
              </Badge>
            </Table.TableCell>
            <Table.TableCell class="whitespace-nowrap text-muted-foreground">
              <span title={new Date(row.created).toLocaleString("th-TH")}>{relativeTime(row.created)}</span>
            </Table.TableCell>
            <Table.TableCell class="text-right">
              <div class="inline-flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={busy === row.id}
                  onclick={() => run(row.id, `ส่ง popup ของ ${row.name}`, () => resendPopup(row.id))}
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
