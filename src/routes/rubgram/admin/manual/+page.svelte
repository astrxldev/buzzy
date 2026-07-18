<script lang="ts">
  import { Plus } from "lucide-svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import type { PageData } from "./$types";
  import { manualCreate } from "../rubgram-admin.remote";

  let { data }: { data: PageData } = $props();
  let name = $state("");
  let price = $state(0);
  let server = $state<"as" | "eu" | "us" | "tw">("as");
  let discord = $state("");
  let username = $state("");
  let display = $state("");
  let services = $state<string[]>([]);
  let slip: File | null = $state(null);
  let message = $state("");
  let busy = $state(false);

  function toggleService(id: string, checked: boolean) {
    services = checked ? [...services, id] : services.filter((service) => service !== id);
  }

  async function submit(ev: SubmitEvent) {
    ev.preventDefault();
    busy = true;
    message = "";
    try {
      const result = await manualCreate({
        name,
        price: Number(price),
        server,
        discord,
        username,
        display,
        services,
        slip,
      });
      await invalidateAll();
      if (result.id) await goto(`/rubgram/admin/${result.id}`);
    } catch (e) {
      message = e instanceof Error ? e.message : `${e}`;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>Create Rubgram Submission</title>
</svelte:head>

<div class="flex h-svh items-center justify-center overflow-y-auto p-4">
  <form
    class="grid w-full max-w-2xl gap-4 rounded-2xl border bg-card/80 p-6 shadow-xl backdrop-blur"
    onsubmit={submit}
  >
    <div>
      <h1 class="text-3xl font-bold">Create Submission</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Manual Rubgram queue entry. Discord lookup is replaced by direct ID fields.
      </p>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <label class="grid gap-1">
        <span class="text-sm font-medium">Name</span>
        <Input bind:value={name} required />
      </label>
      <label class="grid gap-1">
        <span class="text-sm font-medium">Price</span>
        <Input bind:value={price} min="0" type="number" />
      </label>
      <label class="grid gap-1">
        <span class="text-sm font-medium">Server</span>
        <select class="h-9 rounded-md border bg-card px-3 outline-none" bind:value={server}>
          <option value="as">Asia</option>
          <option value="us">America</option>
          <option value="eu">Europe</option>
          <option value="tw">TW, HK, MO</option>
        </select>
      </label>
      <label class="grid gap-1">
        <span class="text-sm font-medium">Slip</span>
        <Input
          type="file"
          accept="image/*"
          onchange={(ev) => (slip = ev.currentTarget.files?.[0] ?? null)}
        />
      </label>
      <label class="grid gap-1">
        <span class="text-sm font-medium">Discord ID</span>
        <Input
          bind:value={discord}
          pattern={"\\d{17,20}"}
          required
        />
      </label>
      <label class="grid gap-1">
        <span class="text-sm font-medium">Username</span>
        <Input bind:value={username} placeholder="username" />
      </label>
      <label class="grid gap-1 md:col-span-2">
        <span class="text-sm font-medium">Display name</span>
        <Input bind:value={display} placeholder="display name" />
      </label>
    </div>

    <fieldset class="grid gap-2 rounded-xl border p-3">
      <legend class="px-1 text-sm font-medium">Services</legend>
      <div class="grid gap-2 md:grid-cols-2">
        {#each data.types as type}
          <label class="flex items-center justify-between gap-2 rounded-md border bg-background/40 px-3 py-2 text-sm">
            <span>{type.display}</span>
            <span class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">{type.price}฿</span>
              <input
                class="accent-primary"
                type="checkbox"
                checked={services.includes(type.id)}
                onchange={(ev) => toggleService(type.id, ev.currentTarget.checked)}
              />
            </span>
          </label>
        {/each}
      </div>
    </fieldset>

    {#if message}
      <p class="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
        {message}
      </p>
    {/if}

    <div class="flex justify-end gap-2">
      <Button variant="outline" href="/rubgram/admin">Cancel</Button>
      <Button type="submit" disabled={busy}>
        <Plus class="size-4" />
        {busy ? "Creating..." : "Create"}
      </Button>
    </div>
  </form>
</div>
