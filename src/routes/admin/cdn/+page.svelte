<script lang="ts">
  import {
    CloudUpload,
    Copy,
    ExternalLink,
    HardDriveDownload,
    Pencil,
    Trash2,
  } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Textarea } from "$lib/components/ui/textarea";
  import PromptDialog from "$lib/components/PromptDialog.svelte";
  import type { PageData } from "./$types";
  import { deleteCdn, importCdn, renameCdn, uploadCdn } from "../admin.remote";

  let { data }: { data: PageData } = $props();
  let query = $state("");
  let selected = $state<string[]>([]);
  let busy = $state(false);
  let message = $state("");
  let importOpen = $state(false);
  let urls = $state("");
  let renameOpen = $state(false);
  let renameId = $state("");
  let renameValue = $state("");
  let removeOpen = $state(false);
  let removeIds = $state<string[]>([]);

  const files = $derived(
    data.files.filter((file) =>
      `${file.name ?? ""} ${file.id} ${file.type}`.toLowerCase().includes(query.toLowerCase()),
    ),
  );

  function formatBytes(value: string) {
    const bytes = Number(value);
    if (!bytes) return "0 B";
    const power = Math.max(0, Math.min(4, Math.floor(Math.log2(bytes) / 10)));
    return `${(bytes / 1024 ** power).toFixed(1)} ${["B", "KB", "MB", "GB", "TB"][power]}`;
  }

  function checked(id: string, state: boolean) {
    selected = state ? [...selected, id] : selected.filter((value) => value !== id);
  }

  async function run(action: () => Promise<unknown>, success: string) {
    busy = true;
    message = "";
    try {
      await action();
      message = success;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }

  async function upload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    await run(() => uploadCdn({ files }), `Uploaded ${files.length} file(s).`);
    input.value = "";
  }

  async function fetchUrls() {
    const values = urls.split("\n").map((url) => url.trim()).filter(Boolean);
    if (!values.length) return;
    await run(() => importCdn(values), `Imported ${values.length} URL(s).`);
    if (!message.startsWith("Failed")) {
      urls = "";
      importOpen = false;
    }
  }

  function rename(id: string, current: string | null) {
    renameId = id;
    renameValue = current ?? "";
    renameOpen = true;
  }

  async function saveRename(value: string) {
    const name = value.trim();
    if (!name) return;
    await run(() => renameCdn({ id: renameId, name }), "File renamed.");
  }

  function remove(ids: string[]) {
    if (!ids.length) return;
    removeIds = [...ids];
    removeOpen = true;
  }

  async function confirmRemove() {
    busy = true;
    message = "";
    try {
      const result = await deleteCdn(removeIds);
      if (result.blocked?.length) {
        message = `Cannot delete: ${result.blocked.map((item) => `${item.id} is used by ${item.reference}`).join(", ")}`;
        return;
      }
      selected = [];
      message = `Deleted ${result.removed?.length ?? 0} file(s).`;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }

  async function copyLink(id: string) {
    await navigator.clipboard.writeText(new URL(`/cdn/${id}`, location.href).href);
    message = "CDN link copied.";
  }
</script>

<svelte:head><title>CDN</title></svelte:head>

<div class="flex min-h-0 flex-col gap-2 p-2 md:h-svh md:pl-0">
  <div class="flex flex-wrap items-center gap-2">
    <Input class="min-w-52 flex-1" type="search" bind:value={query} placeholder="Search files..." />
    <label class="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50" title="Upload files">
      <CloudUpload class="size-4" /><span class="sr-only">Upload files</span>
      <input class="hidden" type="file" multiple disabled={busy} onchange={upload} />
    </label>
    <Dialog.Root bind:open={importOpen}>
      <Dialog.Trigger class="inline-flex size-8 items-center justify-center rounded-lg border bg-background hover:bg-muted" title="Import from URLs">
        <HardDriveDownload class="size-4" />
      </Dialog.Trigger>
      <Dialog.Content class="sm:max-w-lg">
        <Dialog.Header>
          <Dialog.Title>Fetch From URLs</Dialog.Title>
          <Dialog.Description>Enter one URL per line. Each response is stored as a new CDN file.</Dialog.Description>
        </Dialog.Header>
        <Textarea bind:value={urls} class="min-h-40" placeholder="https://cdn.example.com/image.webp" />
        <Dialog.Footer>
          <Button variant="outline" onclick={() => (importOpen = false)}>Cancel</Button>
          <Button disabled={busy || !urls.trim()} onclick={fetchUrls}>Fetch</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
    <Button variant="destructive" disabled={busy || !selected.length} onclick={() => remove(selected)}>
      <Trash2 /> Delete {selected.length || ""}
    </Button>
  </div>

  {#if message}<p class="rounded-md border bg-card px-3 py-2 text-sm" aria-live="polite">{message}</p>{/if}

  <div class="min-h-0 flex-1 overflow-auto rounded-md border bg-[#2225] backdrop-blur-sm">
    <table class="w-full min-w-[48rem] text-left text-sm">
      <thead class="sticky top-0 z-10 border-b bg-card">
        <tr>
          <th class="w-10 p-2">
            <Checkbox
              aria-label="Select visible files"
              checked={files.length > 0 && files.every((file) => selected.includes(file.id))}
              onCheckedChange={(state) => {
                const visible = new Set(files.map((file) => file.id));
                selected = state ? Array.from(new Set([...selected, ...visible])) : selected.filter((id) => !visible.has(id));
              }}
              />
          </th>
          <th class="p-2">Name</th><th class="p-2">ID</th><th class="p-2">Type</th><th class="p-2">Size</th><th class="p-2"></th>
        </tr>
      </thead>
      <tbody>
        {#each files as file (file.id)}
          <tr class="border-b last:border-0 hover:bg-muted/30">
            <td class="p-2"><Checkbox aria-label={`Select ${file.name || file.id}`} checked={selected.includes(file.id)} onCheckedChange={(state) => checked(file.id, state)} /></td>
            <td class="max-w-64 truncate p-2">{file.name || "Unnamed"}</td>
            <td class="max-w-72 truncate p-2 font-mono text-xs text-muted-foreground">{file.id}</td>
            <td class="whitespace-nowrap p-2 text-muted-foreground">{file.type}</td>
            <td class="whitespace-nowrap p-2">{formatBytes(file.size)}</td>
            <td class="flex justify-end gap-1 p-2">
              <Button variant="ghost" size="icon" onclick={() => copyLink(file.id)} title="Copy link"><Copy /></Button>
              <Button variant="ghost" size="icon" onclick={() => rename(file.id, file.name)} title="Rename"><Pencil /></Button>
              <Button variant="ghost" size="icon" href={`/cdn/${file.id}`} target="_blank" rel="noreferrer" title="Open"><ExternalLink /></Button>
              <Button variant="ghost" size="icon" disabled={busy} onclick={() => remove([file.id])} title="Delete"><Trash2 class="text-destructive" /></Button>
            </td>
          </tr>
        {:else}
          <tr><td colspan="6" class="p-8 text-center text-muted-foreground">No CDN files found.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<PromptDialog
  bind:open={renameOpen}
  bind:value={renameValue}
  title="Rename file"
  description="New file name"
  onConfirm={saveRename}
  confirmText="Rename"
/>
<ConfirmDialog
  bind:open={removeOpen}
  title="Confirm deletion"
  description={`Delete ${removeIds.length} file(s)?`}
  onConfirm={confirmRemove}
/>
