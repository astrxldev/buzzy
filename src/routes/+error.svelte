<script lang="ts">
  import { ArrowLeft, House, TriangleAlert } from "lucide-svelte";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
</script>

<svelte:head>
  <title>{page.status} | Buzzy</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="flex min-h-svh items-center justify-center px-6 py-20">
  <section class="w-full max-w-lg rounded-2xl border bg-card/90 p-8 text-center shadow-2xl backdrop-blur-xl">
    <TriangleAlert class="mx-auto size-12 text-amber-400" />
    <p class="mt-4 font-mono text-sm text-muted-foreground">ERROR {page.status}</p>
    <h1 class="mt-2 text-3xl font-bold">
      {page.status === 404 ? "หลงทางแล้วล่ะ" : "ระบบมีปัญหาชั่วคราว"}
    </h1>
    <p class="mt-3 text-muted-foreground">{page.error?.message ?? "โปรดลองใหม่อีกครั้ง"}</p>
    <div class="mt-7 flex justify-center gap-2">
      <Button variant="outline" onclick={() => history.back()}><ArrowLeft /> กลับไป</Button>
      <Button href="/"><House /> หน้าหลัก</Button>
    </div>
  </section>
</main>
