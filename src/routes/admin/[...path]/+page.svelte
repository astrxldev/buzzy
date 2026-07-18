<script lang="ts">
  import { Construction } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Admin Path</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center p-6 text-center">
  <Card.Card class="max-w-lg bg-card/80 p-2 backdrop-blur">
    <Card.CardHeader>
      <Card.CardTitle class="flex justify-center gap-2">
        <Construction class="size-6" />
        Admin path available
      </Card.CardTitle>
      <Card.CardDescription>
        /admin/{data.path} is routed in SvelteKit. This deep CRUD screen has not
        been rebuilt yet; use the migrated list/admin pages for current operations.
      </Card.CardDescription>
    </Card.CardHeader>
    <Card.CardContent class="flex justify-center gap-2">
      <Button href="/admin" variant="outline">Admin dashboard</Button>
      <Button href="/admin/tl/ver">Tierlist versions</Button>
    </Card.CardContent>
  </Card.Card>
</div>
