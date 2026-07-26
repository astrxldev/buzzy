<script lang="ts">
  import { Pencil, Plus, Trash2 } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
   import * as Select from "$lib/components/ui/select";
  import type { PageData } from "./$types";
  import { deleteCharacter, saveCharacter } from "../admin.remote";

  type Character = PageData["chars"][number];
  type Stars = Character["stars"];

  let { data }: { data: PageData } = $props();
  let query = $state("");
  let open = $state(false);
  let originalId = $state<string | undefined>();
  let busy = $state(false);
  let message = $state("");
  let draft = $state<Character>(emptyCharacter());
  let removeOpen = $state(false);

  const chars = $derived(
    data.chars.filter((char) =>
      `${char.name} ${char.amber} ${char.version} ${char.vision} ${char.weapon} ${char.stars}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
  );

  function emptyCharacter(): Character {
    return {
      id: "",
      name: "",
      version: data.versions[0]?.id ?? "",
      stars: 5,
      vision: "anemo",
      image: "",
      weapon: "WEAPON_SWORD_ONE_HAND",
      amber: "",
      order: Math.max(0, ...data.chars.map((char) => char.order)) + 10,
    };
  }

  function create() {
    originalId = undefined;
    draft = emptyCharacter();
    message = "";
    open = true;
  }

  function edit(char: Character) {
    originalId = char.id;
    draft = { ...char };
    message = "";
    open = true;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = "";
    try {
      await saveCharacter({ originalId, value: draft });
      open = false;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!originalId) return;
    removeOpen = true;
  }

  async function confirmRemove() {
    if (!originalId) return;
    busy = true;
    try {
      await deleteCharacter(originalId);
      open = false;
      await invalidateAll();
    } catch (reason) {
      message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Characters</title></svelte:head>

<div class="p-2 md:pl-0">
  <div class="sticky top-0 z-20 mb-4 flex justify-center gap-2 py-2 backdrop-blur">
    <Input class="max-w-xl bg-input" type="search" bind:value={query} placeholder="Search character or use stars, element, weapon..." />
    <Button size="icon" onclick={create} title="Add character"><Plus /></Button>
  </div>

  <div class="flex flex-wrap justify-center gap-4">
    {#each chars as char (char.id)}
      <button class="group w-40 overflow-hidden rounded-xl border bg-card/70 text-left shadow-sm backdrop-blur transition-colors hover:bg-accent" onclick={() => edit(char)}>
        <div class="relative aspect-square bg-black/20">
          <img class="h-full w-full object-cover" src={`/cdn/${char.image}`} alt={char.name} />
          <span class="absolute top-2 right-2 rounded-md bg-card/90 p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100"><Pencil class="size-4" /></span>
        </div>
        <div class="p-3">
          <div class="truncate font-semibold">{char.name}</div>
          <div class="text-xs text-muted-foreground">{char.stars}★ · {char.vision}</div>
        </div>
      </button>
    {/each}
  </div>
</div>

<Dialog.Root bind:open>
  <Dialog.Content class="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>{originalId ? "Edit Character" : "Create Character"}</Dialog.Title>
      <Dialog.Description>Character IDs cannot be changed after creation.</Dialog.Description>
    </Dialog.Header>
    <form class="grid gap-4" onsubmit={save}>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1.5"><Label>Name</Label><Input required bind:value={draft.name} placeholder="Traveler (Electro)" /></label>
        <label class="grid gap-1.5"><Label>ID</Label><Input required disabled={!!originalId} bind:value={draft.id} placeholder="traveler_electro" /></label>
          <label class="grid gap-1.5"><Label>Element</Label><Select.Root type="single" bind:value={draft.vision}><Select.Trigger class="w-full"><span>{draft.vision}</span></Select.Trigger><Select.Content>{#each ["anemo", "geo", "dendro", "hydro", "pyro", "cryo", "electro"] as vision (vision)}<Select.Item value={vision}>{vision}</Select.Item>{/each}</Select.Content></Select.Root></label>
          <label class="grid gap-1.5"><Label>Stars</Label><Select.Root type="single" value={String(draft.stars)} onValueChange={(value) => (draft.stars = Number(value) as Stars)}><Select.Trigger class="w-full"><span>{draft.stars}</span></Select.Trigger><Select.Content><Select.Item value="4">4</Select.Item><Select.Item value="5">5</Select.Item></Select.Content></Select.Root></label>
          <label class="grid gap-1.5"><Label>Version</Label><Select.Root type="single" bind:value={draft.version}><Select.Trigger class="w-full"><span>{data.versions.find((version) => version.id === draft.version)?.name || draft.version}</span></Select.Trigger><Select.Content>{#each data.versions as version (version.id)}<Select.Item value={version.id}>{version.name} ({version.id})</Select.Item>{/each}</Select.Content></Select.Root></label>
        <label class="grid gap-1.5"><Label>Order</Label><Input required type="number" bind:value={draft.order} /></label>
          <label class="grid gap-1.5 sm:col-span-2"><Label>Image</Label><Select.Root type="single" bind:value={draft.image}><Select.Trigger class="w-full"><span>{draft.image ? data.files.find((file) => file.id === draft.image)?.name || draft.image : "Choose CDN file"}</span></Select.Trigger><Select.Content><Select.Item value="">Choose CDN file</Select.Item>{#each data.files as file (file.id)}<Select.Item value={file.id}>{file.name || file.id}</Select.Item>{/each}</Select.Content></Select.Root>{#if draft.image}<img class="h-24 w-24 rounded-md border object-cover" src={`/cdn/${draft.image}`} alt="Selected character" />{/if}</label>
          <label class="grid gap-1.5"><Label>Weapon</Label><Select.Root type="single" bind:value={draft.weapon}><Select.Trigger class="w-full"><span>{draft.weapon}</span></Select.Trigger><Select.Content><Select.Item value="WEAPON_SWORD_ONE_HAND">Sword</Select.Item><Select.Item value="WEAPON_CATALYST">Catalyst</Select.Item><Select.Item value="WEAPON_CLAYMORE">Claymore</Select.Item><Select.Item value="WEAPON_BOW">Bow</Select.Item><Select.Item value="WEAPON_POLE">Polearm</Select.Item></Select.Content></Select.Root></label>
        <label class="grid gap-1.5"><Label>Amber ID</Label><Input required bind:value={draft.amber} placeholder="10000005-electro" /></label>
      </div>
      {#if message}<p class="text-sm text-destructive" aria-live="polite">{message}</p>{/if}
      <Dialog.Footer>
        {#if originalId}<Button type="button" variant="destructive" disabled={busy} onclick={remove}><Trash2 /> Delete</Button>{/if}
        <Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<ConfirmDialog
  bind:open={removeOpen}
  title="Confirm deletion"
  description={`Delete ${draft.name}?`}
  onConfirm={confirmRemove}
/>
