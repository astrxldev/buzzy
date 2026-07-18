<script lang="ts">
  import { Goal, RotateCcw, Save } from "lucide-svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import type { PageData } from "./$types";
  import { resetGoal, setGoal } from "../donate-admin.remote";

  let { data }: { data: PageData } = $props();
  let goal = $state("");
  let busy = $state("");

  $effect(() => {
    goal = data.donateGoal?.toString() ?? "";
  });

  async function save() {
    busy = "save";
    try {
      await setGoal(goal.trim() ? Number(goal) : null);
      await invalidateAll();
      await goto("/donate/admin");
    } finally {
      busy = "";
    }
  }

  async function reset() {
    busy = "reset";
    try {
      await resetGoal();
      await invalidateAll();
      await goto("/donate/admin");
    } finally {
      busy = "";
    }
  }
</script>

<svelte:head>
  <title>Set Donate Goal</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center p-4">
  <Card.Card class="w-full max-w-md bg-card/80 backdrop-blur">
    <Card.CardHeader>
      <Card.CardTitle class="flex items-center gap-2">
        <Goal class="size-5" />
        Set Donate Goal
      </Card.CardTitle>
      <Card.CardDescription>
        Leave blank to remove the target. Reset only restarts goal progress timing.
      </Card.CardDescription>
    </Card.CardHeader>
    <Card.CardContent class="grid gap-4">
      <label class="grid gap-1">
        <span class="text-sm font-medium">Goal amount</span>
        <Input bind:value={goal} type="number" min="0" placeholder="0" />
      </label>
      <div class="flex justify-end gap-2">
        <Button variant="outline" href="/donate/admin">Cancel</Button>
        <Button variant="destructive" disabled={!!busy} onclick={reset}>
          <RotateCcw class="size-4" />
          Reset progress
        </Button>
        <Button disabled={!!busy} onclick={save}>
          <Save class="size-4" />
          Save
        </Button>
      </div>
    </Card.CardContent>
  </Card.Card>
</div>
