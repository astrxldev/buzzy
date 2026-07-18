<script lang="ts">
  import "../app.css";
  import Background from "$lib/components/Background.svelte";
  import Navbar from "$lib/components/Navbar.svelte";

  let { children } = $props();
</script>

<svelte:head>
  <title>เกนชินไม่ใช่เกมมือถือ</title>
  <meta name="description" content="ระบบอีเวนท์ของเกนชินไม่ใช่เกมมือถือ" />
  <meta property="og:site_name" content="เกนชินไม่ใช่เกมมือถือ" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="th_TH" />
</svelte:head>

<Background />
{@render children()}
<Navbar />
