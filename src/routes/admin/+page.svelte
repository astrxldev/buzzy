<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const cards = $derived([
    { label: "Artifact queue", value: data.artifactCount, href: "/artifact/admin" },
    { label: "Rubgram queue", value: data.rubgramCount, href: "/rubgram/admin" },
    {
      label: "Donate today",
      value: `${data.donationStats.today.toLocaleString()}฿`,
      href: "/donate/admin",
    },
    { label: "Guides", value: data.guideCount, href: "/admin/guide" },
    { label: "Characters", value: data.charCount, href: "/admin/char" },
    { label: "CDN files", value: data.cdnCount, href: "/admin/cdn" },
  ]);
</script>

<svelte:head>
  <title>Admin Dashboard</title>
</svelte:head>

<div class="p-6">
  <div class="mb-6">
    <h1 class="text-4xl font-bold">ยินดีต้อนรับกลับ!</h1>
    <p class="mt-1 text-muted-foreground">
      Admin dashboard for migrated SvelteKit routes.
    </p>
  </div>

  <div class="grid gap-3 md:grid-cols-3">
    {#each cards as card}
      <a
        class="rounded-2xl border bg-card/70 p-5 shadow-sm backdrop-blur transition-colors hover:bg-accent"
        href={card.href}
      >
        <div class="text-sm text-muted-foreground">{card.label}</div>
        <div class="mt-2 text-3xl font-bold">{card.value}</div>
      </a>
    {/each}
  </div>
</div>
