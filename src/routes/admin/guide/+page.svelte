<script lang="ts">
  import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import type { PageData } from "./$types";
  import { deleteGuide, saveGuide, toggleGuide } from "../admin.remote";

  type Guide = PageData["guides"][number];
  let { data }: { data: PageData } = $props();
  let open = $state(false);
  let editingId = $state<string | undefined>();
  let busy = $state("");
  let message = $state("");
  let draft = $state<Guide>(emptyGuide());

  function emptyGuide(): Guide {
    return { id: "", name: "", link: "", image: null, order: data.nextOrder, hidden: false };
  }

  function create() {
    editingId = undefined;
    draft = emptyGuide();
    message = "";
    open = true;
  }

  function edit(guide: Guide) {
    editingId = guide.id;
    draft = { ...guide };
    message = "";
    open = true;
  }

  async function toggle(id: string) {
    busy = id;
    try {
      await toggleGuide(id);
      await invalidateAll();
    } finally {
      busy = "";
    }
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = "save";
    message = "";
    try {
      await saveGuide({
        id: editingId,
        value: { name: draft.name, link: draft.link, image: draft.image, order: draft.order, hidden: draft.hidden },
      });
      open = false;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = "";
    }
  }

  async function remove() {
    if (!editingId || !window.confirm(`Delete ${draft.name}?`)) return;
    busy = "delete";
    try {
      await deleteGuide(editingId);
      open = false;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = "";
    }
  }
</script>

<svelte:head><title>Guides</title></svelte:head>

<div class="mx-2 flex flex-col gap-2 pt-5 md:ml-0">
  <Button class="w-fit" onclick={create}><Plus /> Add guide</Button>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(min(300px,calc(100svw-2rem-2px)),1fr))] gap-4">
    {#each data.guides as guide (guide.id)}
      <article class={["group relative rounded-sm border bg-card/50 py-3 backdrop-blur-sm transition-colors hover:bg-border sm:rounded-xl sm:py-6", guide.hidden && "opacity-70"]}>
        <div class="absolute top-0 right-0 z-10 m-2 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <Button size="icon" variant="outline" disabled={busy === guide.id} onclick={() => toggle(guide.id)} title="Toggle visibility">
            {#if guide.hidden}<EyeOff />{:else}<Eye />{/if}
          </Button>
          <Button size="icon" variant="outline" onclick={() => edit(guide)} title="Edit guide"><Pencil /></Button>
        </div>
        <div class="px-3 sm:px-6">
          <h2 class="text-lg font-semibold">{guide.name}</h2>
          <div class="relative mt-2 aspect-square w-full overflow-hidden rounded-sm border sm:rounded-lg">
            {#if guide.image}<img src={`/cdn/${guide.image}`} alt={guide.name} class="h-full w-full object-cover" />{/if}
          </div>
        </div>
      </article>
    {/each}
  </div>
</div>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>{editingId ? "Edit Guide" : "Add Guide"}</Dialog.Title>
      <Dialog.Description>Guide cards link to an external document or page.</Dialog.Description>
    </Dialog.Header>
    <form class="grid gap-4" onsubmit={save}>
      <div class="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <label class="grid gap-1.5"><Label>Name</Label><Input required bind:value={draft.name} placeholder="[6.3] Character Guide" /></label>
        <label class="grid gap-1.5"><Label>Order</Label><Input required type="number" bind:value={draft.order} /></label>
      </div>
      <label class="grid gap-1.5"><Label>Link</Label><Input required type="url" bind:value={draft.link} placeholder="https://docs.google.com/..." /></label>
      <label class="grid gap-1.5"><Label>Image (optional)</Label><select class="h-8 rounded-lg border bg-background px-2 text-sm" value={draft.image ?? ""} onchange={(event) => (draft.image = event.currentTarget.value || null)}><option value="">No image</option>{#each data.files as file (file.id)}<option value={file.id}>{file.name || file.id}</option>{/each}</select></label>
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={draft.hidden} /> Hidden</label>
      {#if message}<p class="text-sm text-destructive" aria-live="polite">{message}</p>{/if}
      <Dialog.Footer>
        {#if editingId}<Button type="button" variant="destructive" disabled={!!busy} onclick={remove}><Trash2 /> Delete</Button>{/if}
        <Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
        <Button type="submit" disabled={!!busy}>{busy === "save" ? "Saving..." : "Save"}</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
