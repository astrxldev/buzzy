<script lang="ts">
  import { ExternalLink, PencilLine, Plus, Trash2 } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";
  import { untrack } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import type { PageData } from "./$types";
  import {
    deleteTierlistType,
    deleteTierlistVersion,
    saveTierlistType,
    saveTierlistVersion,
  } from "../../admin.remote";

  type TlType = PageData["types"][number];
  type TlVersion = TlType["versions"][number];
  type TypeDraft = Pick<TlType, "id" | "name" | "image" | "order" | "mode">;
  type VersionDraft = Pick<TlVersion, "id" | "name" | "type" | "image" | "disclaimer" | "deprecates" | "from" | "order" | "hidden">;

  let { data }: { data: PageData } = $props();
  let dialog = $state<"type" | "version" | null>(null);
  let originalId = $state<string | undefined>();
  let busy = $state(false);
  let message = $state("");
  let typeDraft = $state<TypeDraft>(emptyType());
  let versionDraft = $state<VersionDraft>(untrack(() => emptyVersion(data.types[0]?.id ?? "")));

  function emptyType(): TypeDraft {
    return {
      id: "",
      name: "",
      image: null,
      mode: "",
      order: Math.max(0, ...data.types.map((type) => type.order)) + 10,
    };
  }

  function emptyVersion(type: string): VersionDraft {
    const versions = data.types.find((entry) => entry.id === type)?.versions ?? [];
    return {
      id: "",
      name: "",
      type,
      image: null,
      disclaimer: versions.find((entry) => entry.disclaimer)?.disclaimer ?? null,
      deprecates: "",
      from: data.gameVersions[0]?.id ?? "",
      order: Math.max(0, ...versions.map((version) => version.order)) + 10,
      hidden: false,
    };
  }

  function createType() {
    originalId = undefined;
    typeDraft = emptyType();
    message = "";
    dialog = "type";
  }

  function editType(type: TlType) {
    originalId = type.id;
    typeDraft = { id: type.id, name: type.name, image: type.image, order: type.order, mode: type.mode };
    message = "";
    dialog = "type";
  }

  function createVersion(type: string) {
    originalId = undefined;
    versionDraft = emptyVersion(type);
    message = "";
    dialog = "version";
  }

  function editVersion(version: TlVersion) {
    originalId = version.id;
    versionDraft = {
      id: version.id,
      name: version.name,
      type: version.type,
      image: version.image,
      disclaimer: version.disclaimer,
      deprecates: version.deprecates,
      from: version.from,
      order: version.order,
      hidden: version.hidden,
    };
    message = "";
    dialog = "version";
  }

  async function saveType(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = "";
    try {
      await saveTierlistType({ originalId, value: typeDraft });
      dialog = null;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }

  async function saveVersion(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = "";
    try {
      await saveTierlistVersion({ originalId, value: versionDraft });
      dialog = null;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }

  async function removeType() {
    if (!originalId || !window.confirm(`Delete ${typeDraft.name} and all of its versions and states?`)) return;
    busy = true;
    try {
      await deleteTierlistType(originalId);
      dialog = null;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }

  async function removeVersion() {
    if (!originalId || !window.confirm(`Delete ${versionDraft.name} and all of its states?`)) return;
    busy = true;
    try {
      await deleteTierlistVersion({ id: originalId, type: versionDraft.type });
      dialog = null;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Tierlist Versions</title></svelte:head>

<div class="mx-2 flex flex-col gap-3 pt-5 md:ml-0">
  <Button class="w-fit" onclick={createType}><Plus /> Create type</Button>
  {#each data.types as type (type.id)}
    <section class="group/type flex flex-col gap-1">
      <div class="flex w-fit flex-wrap items-center gap-2">
        <div class="flex flex-auto flex-wrap items-baseline gap-x-2 rounded-md border bg-[#2228] px-2 py-1 text-3xl font-semibold sm:text-4xl">
          <span>{type.name}</span><kbd class="rounded border px-1.5 py-0.5 font-mono text-xs">{type.id}</kbd><span class="text-xs text-muted-foreground">{type.mode}</span>
        </div>
        <div class="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover/type:opacity-100">
          <Button onclick={() => createVersion(type.id)}><Plus /> <span class="md:hidden">Add</span></Button>
          <Button variant="outline" onclick={() => editType(type)}><PencilLine /> <span class="md:hidden">Edit</span></Button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each type.versions as version (version.id)}
          <article class={["group/ver relative flex aspect-video w-[calc(100svw-1rem)] max-w-full items-center justify-center overflow-hidden rounded-sm border bg-[#1118] text-4xl font-bold backdrop-blur-xl md:w-60", version.hidden && "opacity-50"]}>
            {#if version.image}<img src={`/cdn/${version.image}`} alt={version.name} class="absolute inset-0 h-full w-full object-cover" />{:else}{version.name}{/if}
            <div class="absolute bottom-0 flex w-full justify-center gap-1 bg-card py-1 text-base font-normal">{version.name} <kbd class="rounded border px-1 font-mono text-xs">{version.id}</kbd></div>
            <div class="absolute top-1 right-1 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover/ver:opacity-100">
              <Button variant="outline" size="icon" href={`/tl/${type.id}/${version.id}/admin`} target="_blank" title="Open in admin"><ExternalLink /></Button>
              <Button variant="outline" size="icon" onclick={() => editVersion(version)} title="Edit version"><PencilLine /></Button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/each}
</div>

<Dialog.Root open={dialog === "type"} onOpenChange={(open) => !open && (dialog = null)}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header><Dialog.Title>{originalId ? "Edit Tierlist Type" : "Create Tierlist Type"}</Dialog.Title></Dialog.Header>
    <form class="grid gap-4" onsubmit={saveType}>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1.5"><Label>Name</Label><Input required bind:value={typeDraft.name} /></label>
        <label class="grid gap-1.5"><Label>ID</Label><Input required disabled={!!originalId} bind:value={typeDraft.id} /></label>
        <label class="grid gap-1.5"><Label>Mode</Label><Input required bind:value={typeDraft.mode} /></label>
        <label class="grid gap-1.5"><Label>Order</Label><Input required type="number" bind:value={typeDraft.order} /></label>
      </div>
        <label class="grid gap-1.5"><Label>Image (optional)</Label><select class="h-8 rounded-lg border bg-background px-2 text-sm" value={typeDraft.image ?? ""} onchange={(event) => (typeDraft.image = event.currentTarget.value || null)}><option value="">No image</option>{#each data.files as file (file.id)}<option value={file.id}>{file.name || file.id}</option>{/each}</select></label>
      {#if message}<p class="text-sm text-destructive" aria-live="polite">{message}</p>{/if}
      <Dialog.Footer>
        {#if originalId}<Button type="button" variant="destructive" disabled={busy} onclick={removeType}><Trash2 /> Delete</Button>{/if}
        <Button type="button" variant="outline" onclick={() => (dialog = null)}>Cancel</Button><Button type="submit" disabled={busy}>Save</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={dialog === "version"} onOpenChange={(open) => !open && (dialog = null)}>
  <Dialog.Content class="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
    <Dialog.Header><Dialog.Title>{originalId ? "Edit Tierlist Version" : "Create Tierlist Version"}</Dialog.Title></Dialog.Header>
    <form class="grid gap-4" onsubmit={saveVersion}>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1.5"><Label>Name</Label><Input required bind:value={versionDraft.name} placeholder="6.3a" /></label>
        <label class="grid gap-1.5"><Label>ID</Label><Input required disabled={!!originalId} bind:value={versionDraft.id} placeholder="63a" /></label>
        <label class="grid gap-1.5"><Label>Game version</Label><select class="h-8 rounded-lg border bg-background px-2 text-sm" required bind:value={versionDraft.from}>{#each data.gameVersions as version (version.id)}<option value={version.id}>{version.name} ({version.id})</option>{/each}</select></label>
        <label class="grid gap-1.5"><Label>Order</Label><Input required type="number" bind:value={versionDraft.order} /></label>
        <label class="grid gap-1.5"><Label>Deprecation date</Label><Input required type="date" bind:value={versionDraft.deprecates} /></label>
        <label class="flex items-end gap-2 pb-1 text-sm"><input type="checkbox" bind:checked={versionDraft.hidden} /> Hidden</label>
        <label class="grid gap-1.5"><Label>Image (optional)</Label><select class="h-8 rounded-lg border bg-background px-2 text-sm" value={versionDraft.image ?? ""} onchange={(event) => (versionDraft.image = event.currentTarget.value || null)}><option value="">No image</option>{#each data.files as file (file.id)}<option value={file.id}>{file.name || file.id}</option>{/each}</select></label>
        <label class="grid gap-1.5"><Label>Disclaimer (optional)</Label><select class="h-8 rounded-lg border bg-background px-2 text-sm" value={versionDraft.disclaimer ?? ""} onchange={(event) => (versionDraft.disclaimer = event.currentTarget.value || null)}><option value="">No disclaimer</option>{#each data.files as file (file.id)}<option value={file.id}>{file.name || file.id}</option>{/each}</select></label>
      </div>
      {#if message}<p class="text-sm text-destructive" aria-live="polite">{message}</p>{/if}
      <Dialog.Footer>
        {#if originalId}<Button type="button" variant="destructive" disabled={busy} onclick={removeVersion}><Trash2 /> Delete</Button>{/if}
        <Button type="button" variant="outline" onclick={() => (dialog = null)}>Cancel</Button><Button type="submit" disabled={busy}>Save</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
