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
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import AdminHealth from "$lib/components/AdminHealth.svelte";
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
  } from "$lib/components/ui/sidebar";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } =
    $props();

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

<SidebarProvider>
  <Sidebar variant="floating">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={active("/admin")}>
            {#snippet child({ props })}
              <a {...props} href={resolve("/admin")}>
                <Computer class="size-5" />
                <span class="text-base font-semibold">Buzzy Inc.</span>
              </a>
            {/snippet}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {#each links.slice(0, 1) as item (item.href)}
              {@const Icon = item.icon}
              <SidebarMenuItem>
                <SidebarMenuButton isActive={active(item.href)} tooltipContent={item.label}>
                  {#snippet child({ props })}
                    <a {...props} href={resolve(item.href as "/admin")}>
                      <Icon />
                      <span>{item.label}</span>
                    </a>
                  {/snippet}
                </SidebarMenuButton>
              </SidebarMenuItem>
            {/each}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Admin Pages</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {#each links.slice(1, 5) as item (item.href)}
              {@const Icon = item.icon}
              <SidebarMenuItem>
                <SidebarMenuButton isActive={active(item.href)} tooltipContent={item.label}>
                  {#snippet child({ props })}
                    <a {...props} href={resolve(item.href as "/admin")}>
                      <Icon />
                      <span>{item.label}</span>
                    </a>
                  {/snippet}
                </SidebarMenuButton>
              </SidebarMenuItem>
            {/each}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Tierlist Admin</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {#each links.slice(7, 8) as item (item.href)}
              {@const Icon = item.icon}
              <SidebarMenuItem>
                <SidebarMenuButton isActive={active(item.href)} tooltipContent={item.label}>
                  {#snippet child({ props })}
                    <a {...props} href={resolve(item.href as "/admin")}>
                      <Icon />
                      <span>{item.label}</span>
                    </a>
                  {/snippet}
                </SidebarMenuButton>
              </SidebarMenuItem>
            {/each}
            {#each data.tierlists as tierlist (tierlist.url)}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={active(
                    resolve("/tl/[type]/[ver]/admin", {
                      type: tierlist.url.split("/")[0],
                      ver: tierlist.url.split("/")[1],
                    }),
                  )}
                >
                  {#snippet child({ props })}
                    <a
                      {...props}
                      href={resolve("/tl/[type]/[ver]/admin", {
                        type: tierlist.url.split("/")[0],
                        ver: tierlist.url.split("/")[1],
                      })}
                    >
                      <span>{tierlist.name}</span>
                    </a>
                  {/snippet}
                </SidebarMenuButton>
              </SidebarMenuItem>
            {/each}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarGroup>
        <SidebarGroupLabel>Global</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {#each [...links.slice(5, 7), ...links.slice(8)] as item (item.href)}
              {@const Icon = item.icon}
              <SidebarMenuItem>
                <SidebarMenuButton isActive={active(item.href)} tooltipContent={item.label}>
                  {#snippet child({ props })}
                    <a {...props} href={resolve(item.href as "/admin")}>
                      <Icon />
                      <span>{item.label}</span>
                    </a>
                  {/snippet}
                </SidebarMenuButton>
              </SidebarMenuItem>
            {/each}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <div class="px-2 text-xs text-muted-foreground">
        <AdminHealth />
        <span>{data.versions.length} game versions indexed</span>
      </div>
    </SidebarFooter>
  </Sidebar>

  <SidebarInset class="bg-transparent">
    <header class="sticky top-0 z-40 flex h-12 items-center gap-2 border-b bg-card/80 px-2 backdrop-blur-xl md:hidden">
      <SidebarTrigger aria-label="Toggle admin navigation" />
      <a class="flex items-center gap-2 font-semibold" href={resolve("/admin")}>
        <Computer class="size-5" />
        Buzzy Inc.
      </a>
    </header>
    {@render children()}
  </SidebarInset>
</SidebarProvider>
