<script lang="ts">
  import { page } from "$app/state";
  import {
    Bitcoin,
    Feather,
    Home,
    LoaderPinwheel,
    StickyNote,
    Table,
  } from "lucide-svelte";
  import { cn } from "$lib/utils";

  const pathname = $derived(page.url.pathname);
  const visible = $derived(
    /^\/(?:tl(?:\/[a-zA-Z0-9]+)?|rubgram|artifact|guide|donate)$/.test(
      pathname,
    ),
  );

  const items = [
    { href: "/", name: "หน้าหลัก", icon: Home, divide: true },
    { href: "/artifact", name: "เสือกไอดีชาวบ้าน", icon: Feather },
    { href: "/rubgram", name: "รับกรรมแทนทางบ้าน", icon: LoaderPinwheel },
    { href: "/tl", name: "จัดเทียร์ลิสต์", icon: Table },
    { href: "/guide", name: "ไกด์ตัวละคร", icon: StickyNote },
    { href: "/donate", name: "โดเนท", icon: Bitcoin, last: true },
  ];
</script>

{#if visible}
  <nav
    class={cn(
      "absolute flex gap-2 rounded-lg border bg-card p-2",
      pathname === "/guide"
        ? "top-3 left-3 max-sm:top-2 max-sm:right-2 max-sm:left-auto"
        : "top-3 left-3",
    )}
    aria-label="Main navigation"
  >
    {#each items as item}
      {@const Icon = item.icon}
      <a
        class={cn(
          "group flex gap-1 transition-[width]",
          item.divide && "-mr-1 border-r-2 pr-1",
        )}
        href={item.href}
      >
        <Icon size={16} />
        <span
          class={cn(
            "overflow-hidden text-xs whitespace-nowrap",
            "max-w-0 opacity-0",
            "group-hover:max-w-40 group-hover:opacity-100",
            "transition-all delay-200 duration-300 ease-out",
            "-mr-1",
            item.divide || item.last || "-mr-3 border-r-2 pr-1",
            item.divide && "group-hover:mr-0",
          )}
        >
          {item.name}
        </span>
      </a>
    {/each}
  </nav>
{/if}
