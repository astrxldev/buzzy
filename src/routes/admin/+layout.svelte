<script lang="ts">
  import {
    BadgeDollarSign,
    Bitcoin,
    Compass,
    Computer,
    GitGraph,
    IdCard,
    Package,
    ScrollText,
    Settings,
    SquareUserRound,
  } from "lucide-svelte";
  import { page } from "$app/state";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } =
    $props();

  const links = $derived([
    { href: "/admin", label: "Dashboard", icon: Computer },
    { href: "/artifact/admin", label: "Artifact", icon: IdCard },
    { href: "/rubgram/admin", label: "Rubgram", icon: BadgeDollarSign },
    { href: "/donate/admin", label: "Donate", icon: Bitcoin },
    { href: "/admin/guide", label: "Guides", icon: Compass },
    { href: "/admin/char", label: "Characters", icon: SquareUserRound },
    { href: "/admin/cdn", label: "CDN", icon: Package },
    { href: "/admin/tl/ver", label: "Tierlists", icon: GitGraph },
    { href: "/admin/log", label: "Audit Log", icon: ScrollText },
    { href: "/admin/settings", label: "Settings", icon: Settings },
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

<div class="grid min-h-svh bg-background/20 md:grid-cols-[17rem_1fr]">
  <aside class="flex min-h-svh flex-col border-r bg-card/70 p-3 backdrop-blur-xl">
    <a class="mb-3 flex items-center gap-2 rounded-md px-2 py-1.5 font-bold" href="/admin">
      <Computer class="size-5" />
      Buzzy Inc.
    </a>

    <nav class="grid gap-1">
      {#each links as item}
        {@const Icon = item.icon}
        <a
          class={[
            "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
            active(item.href) && "bg-accent text-accent-foreground",
          ]}
          href={item.href}
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
          {#each data.tierlists as tierlist}
            <a
              class="truncate rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              href={`/tl/${tierlist.url}/admin`}
            >
              {tierlist.name}
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <div class="mt-auto pt-4 text-xs text-muted-foreground">
      {data.versions.length} game versions indexed
    </div>
  </aside>

  <main class="min-w-0">
    {@render children()}
  </main>
</div>
