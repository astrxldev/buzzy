<script lang="ts">
  import {
    BadgeDollarSign,
    Bitcoin,
    Compass,
    Computer,
    GitGraph,
    IdCard,
    Menu,
    Package,
    ScrollText,
    Settings,
    SquareUserRound,
    X,
  } from "lucide-svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import AdminHealth from "$lib/components/AdminHealth.svelte";
  import { Button } from "$lib/components/ui/button";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } =
    $props();
  let mobileOpen = $state(false);

  const links = $derived([
    { href: resolve("/admin"), label: "Dashboard", icon: Computer },
    { href: resolve("/artifact/admin"), label: "Artifact", icon: IdCard },
    { href: resolve("/rubgram/admin"), label: "Rubgram", icon: BadgeDollarSign },
    { href: resolve("/donate/admin"), label: "Donate", icon: Bitcoin },
    { href: resolve("/admin/guide"), label: "Guides", icon: Compass },
    { href: resolve("/admin/char"), label: "Characters", icon: SquareUserRound },
    { href: resolve("/admin/cdn"), label: "CDN", icon: Package },
    { href: resolve("/admin/tl/ver"), label: "Tierlists", icon: GitGraph },
    { href: resolve("/admin/log"), label: "Audit Log", icon: ScrollText },
    { href: resolve("/admin/settings"), label: "Settings", icon: Settings },
  ]);

  function active(href: string) {
    return href === "/admin"
      ? page.url.pathname === href
      : page.url.pathname.startsWith(href);
  }

</script>

<svelte:head>
  <title>Admin</title>
</svelte:head>

<div class="min-h-svh bg-background/20 md:grid md:grid-cols-[17rem_1fr]">
  <header class="sticky top-0 z-40 flex h-12 items-center gap-2 border-b bg-card/80 px-2 backdrop-blur-xl md:hidden">
    <Button variant="ghost" size="icon" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Toggle admin navigation">
      {#if mobileOpen}<X />{:else}<Menu />{/if}
    </Button>
    <a class="flex items-center gap-2 font-semibold" href={resolve("/admin")}><Computer class="size-5" /> Buzzy Inc.</a>
    <nav class="ml-auto flex min-w-0 gap-1 overflow-x-auto">
      {#each links.slice(4) as item (item.href)}
        {@const Icon = item.icon}
        <a class={["flex size-8 shrink-0 items-center justify-center rounded-md", active(item.href) ? "bg-accent" : "text-muted-foreground hover:bg-accent"]} href={resolve(item.href as "/admin")} aria-label={item.label} title={item.label}><Icon class="size-4" /></a>
      {/each}
    </nav>
  </header>

  {#if mobileOpen}
    <button class="fixed inset-0 z-40 bg-black/60 md:hidden" aria-label="Close admin navigation" onclick={() => (mobileOpen = false)}></button>
  {/if}

  <aside class={["fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card p-3 shadow-xl backdrop-blur-xl transition-transform md:sticky md:top-0 md:z-auto md:min-h-svh md:w-auto md:translate-x-0 md:bg-card/70 md:shadow-none", mobileOpen ? "translate-x-0" : "-translate-x-full"]}>
    <a class="mb-3 flex items-center gap-2 rounded-md px-2 py-1.5 font-bold" href={resolve("/admin")}>
      <Computer class="size-5" />
      Buzzy Inc.
    </a>

    <nav class="grid gap-1">
      {#each links as item (item.href)}
        {@const Icon = item.icon}
        <a
          class={[
            "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
            active(item.href) && "bg-accent text-accent-foreground",
          ]}
          href={resolve(item.href as "/admin")}
          onclick={() => (mobileOpen = false)}
        >
          <Icon class="size-4" />
          {item.label}
        </a>
      {/each}
    </nav>

    {#if data.tierlists.length}
      <div class="mt-5 border-t pt-3">
        <div class="px-2 text-xs font-medium text-muted-foreground">Tierlist Admin</div>
        <div class="mt-1 grid gap-1">
          {#each data.tierlists as tierlist (tierlist.url)}
            <a
              class="truncate rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              href={resolve("/tl/[type]/[ver]/admin", { type: tierlist.url.split("/")[0], ver: tierlist.url.split("/")[1] })}
              onclick={() => (mobileOpen = false)}
            >
              {tierlist.name}
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <div class="mt-auto grid gap-1 pt-4 text-xs text-muted-foreground">
      <AdminHealth />
      <span>{data.versions.length} game versions indexed</span>
    </div>
  </aside>

  <main class="min-w-0 overflow-x-hidden">
    {@render children()}
  </main>
</div>
