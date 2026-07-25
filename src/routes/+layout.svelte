<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import Background from "$lib/components/Background.svelte";
  import DeploymentStatus from "$lib/components/DeploymentStatus.svelte";
  import Navbar from "$lib/components/Navbar.svelte";
  import PostHog from "$lib/components/PostHog.svelte";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } = $props();
  const isWidget = $derived(page.route.id?.startsWith("/(widgets)/") ?? false);
  const social = $derived.by(() => {
    const entries: Record<string, { title: string; description: string }> = {
      "/": {
        title: "เกนชินไม่ใช่เกมมือถือ",
        description: "ระบบอีเวนท์ของเกนชินไม่ใช่เกมมือถือ",
      },
      "/artifact": {
        title: "เสือกไอดีชาวบ้าน",
        description: "ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม",
      },
      "/rubgram": {
        title: "รับกรรมแทนทางบ้าน",
        description: "รับเล่นคอนเทนต์เอนเกมเกนชินแทนคนดู",
      },
      "/guide": {
        title: "ไกด์ตัวละคร",
        description: "ไกด์ปั้นตัวละครโดยเกนชินไม่ใช่เกมมือถือ",
      },
      "/donate": {
        title: "โดเนทขึ้นจอ",
        description: "สนับสนุนสตรีมและส่งข้อความขึ้นจอ",
      },
      "/tl": {
        title: "จัดเทียร์ลิสต์",
        description: "ระบบจัดเทียร์ลิสต์ตัวละครของคอนเทนต์เอนเกม",
      },
    };
    return entries[page.url.pathname] ??
      (page.url.pathname.startsWith("/tl/") ? entries["/tl"] : entries["/"]);
  });
</script>

<svelte:head>
  <title>เกนชินไม่ใช่เกมมือถือ</title>
  <meta name="description" content="ระบบอีเวนท์ของเกนชินไม่ใช่เกมมือถือ" />
  <meta property="og:site_name" content="เกนชินไม่ใช่เกมมือถือ" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="th_TH" />
  <meta property="og:title" content={social.title} />
  <meta property="og:description" content={social.description} />
  <meta property="og:url" content={page.url.href} />
  <meta property="og:image" content={`${page.url.origin}/web_banner.png`} />
  <meta property="og:image:alt" content="เกนชินไม่ใช่เกมมือถือ" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={social.title} />
  <meta name="twitter:description" content={social.description} />
  <meta name="twitter:image" content={`${page.url.origin}/web_banner.png`} />
  <link rel="canonical" href={`${page.url.origin}${page.url.pathname}`} />
</svelte:head>

{#if !isWidget}
  <Background />
{/if}
{@render children()}
{#if !isWidget}
  <Navbar />
  <DeploymentStatus />
{/if}

{#if data.posthog}
  <PostHog {...data.posthog} />
{/if}
