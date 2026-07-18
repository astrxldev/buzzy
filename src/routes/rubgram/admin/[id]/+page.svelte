<script lang="ts">
  import {
    BadgeDollarSign,
    Check,
    Copy,
    CopyCheck,
    Download,
    ImageOff,
    MessageSquareWarning,
    Send,
    X,
  } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import type { PageData } from "./$types";
  import {
    addNote,
    debugUploadSlip,
    deleteNote,
    discordCall,
  } from "../rubgram-admin.remote";

  let { data }: { data: PageData } = $props();
  let copied = $state(false);
  let noteText = $state("");
  let notes = $state<PageData["sub"]["notes"]>([]);
  let busy = $state("");

  const serverLabels: Record<string, string> = {
    as: "Asia",
    eu: "Europe",
    tw: "Taiwan",
    us: "America",
  };
  const serviceNames = $derived(
    data.sub.service.map((id) => data.typeNames[id] || id).join(", "),
  );

  $effect(() => {
    notes = data.sub.notes || [];
  });

  async function copyUsername() {
    if (copied || !data.discord?.username) return;
    await navigator.clipboard.writeText(data.discord.username);
    copied = true;
    window.setTimeout(() => (copied = false), 2000);
  }

  async function callDiscord() {
    busy = "call";
    try {
      await discordCall(data.sub.user);
    } finally {
      busy = "";
    }
  }

  async function createNote() {
    const text = noteText.trim();
    if (!text) return;
    busy = "note";
    try {
      const note = await addNote({ id: data.sub.id, text });
      notes = [note, ...notes];
      noteText = "";
    } finally {
      busy = "";
    }
  }

  async function removeNote(noteId: string) {
    notes = notes.filter((note) => note.id !== noteId);
    await deleteNote({ id: data.sub.id, noteId });
  }

  async function uploadSlip(ev: Event) {
    const file = (ev.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    busy = "slip";
    try {
      await debugUploadSlip({ id: data.sub.id, slip: file });
      await invalidateAll();
    } finally {
      busy = "";
    }
  }
</script>

<svelte:head>
  <title>{data.sub.name} · Rubgram Admin</title>
</svelte:head>

<div class="flex h-svh flex-col gap-2 p-2">
  <section class="grid gap-2 md:grid-cols-[1fr_11rem]">
    <article class="rounded-xl border bg-card/75 p-5 shadow-sm backdrop-blur">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 class="text-2xl font-bold">
            {data.sub.queue}. {data.sub.name}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Server:
            <b class="text-foreground">{serverLabels[data.sub.server]}</b>
            <br />
            บริการ: <b class="text-foreground">{serviceNames}</b>
          </p>
        </div>
        <div class="flex flex-wrap gap-1">
          <span class="rounded-full border px-3 py-1 text-xs">
            {data.sub.checked ? "checked" : "pending"}
          </span>
          <span
            class={[
              "rounded-full border px-3 py-1 text-xs",
              data.sub.paid ? "border-emerald-400 text-emerald-300" : "border-yellow-400 text-yellow-300",
            ]}
          >
            {data.sub.paid ? "paid" : "unpaid"}
          </span>
        </div>
      </div>
      <div class="mt-5 flex flex-wrap items-center gap-2">
        <Button onclick={callDiscord} disabled={busy === "call"}>
          {#if busy === "call"}
            <Send class="size-4 animate-pulse" />
          {:else}
            <MessageSquareWarning class="size-4" />
          {/if}
          เรียกในดิสคอร์ด
        </Button>
        <Button variant="ghost" onclick={copyUsername} disabled={copied || !data.discord}>
          {#if copied}
            <CopyCheck class="size-4" />
          {:else}
            <Copy class="size-4" />
          {/if}
          {data.discord?.username || data.sub.user}
        </Button>
      </div>
    </article>

    <aside class="overflow-hidden rounded-xl border bg-card/75 backdrop-blur">
      {#if data.slip}
        <a
          class="group relative block aspect-square overflow-hidden bg-black/20"
          href={`/api/slip/${data.slip.id}`}
          target="_blank"
          rel="noreferrer"
        >
          <img
            class="h-full w-full object-cover blur-sm brightness-50 transition group-hover:blur-none group-hover:brightness-100"
            src={`/api/slip/${data.slip.id}`}
            alt="Payment slip"
          />
          <span class="absolute inset-0 flex items-center justify-center gap-2 text-sm group-hover:hidden">
            <Download class="size-4" /> เปิดสลิป
          </span>
        </a>
      {:else if data.sub.price <= 0}
        <div class="flex aspect-square flex-col items-center justify-center gap-2">
          <BadgeDollarSign />
          ฟรี
        </div>
      {:else}
        <label class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-accent">
          <ImageOff />
          ยังไม่จ่าย
          <span class="text-xs">กดเพื่ออัพสลิป</span>
          <input hidden type="file" accept="image/*" onchange={uploadSlip} />
        </label>
      {/if}
    </aside>
  </section>

  <section class="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card/75 p-3 backdrop-blur">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <Input
        class="min-w-56"
        bind:value={noteText}
        placeholder="พิมพ์โน๊ต..."
        onkeydown={(ev) => ev.key === "Enter" && createNote()}
      />
      <Button size="sm" onclick={createNote} disabled={busy === "note" || !noteText.trim()}>
        <Send class="size-4" />
        เพิ่มโน๊ต
      </Button>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
      {#each notes as note, i (note.id)}
        <article
          class="group relative min-h-40 rounded-md border p-3"
          style={`background: hsla(${(i * 47 + data.sub.queue * 13) % 360}, 42%, 35%, 0.74)`}
        >
          <p class="whitespace-pre-wrap text-sm">{note.text}</p>
          <button
            class="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
            type="button"
            aria-label="Delete note"
            onclick={() => removeNote(note.id)}
          >
            <X class="size-4" />
          </button>
          <div class="absolute right-2 bottom-2 text-[10px] opacity-60">
            {new Date(note.createdAt).toLocaleString()}
          </div>
        </article>
      {/each}
      {#if !notes.length}
        <div class="rounded-md border border-dashed p-6 text-center text-muted-foreground">
          ไม่มีโน๊ต
        </div>
      {/if}
    </div>
  </section>
</div>
