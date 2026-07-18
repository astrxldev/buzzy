<script lang="ts">
  import { Loader2, UserLock } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let email = $state("");
  let password = $state("");
  let loading = $state(false);
  let message = $state("");

  async function submit(ev: SubmitEvent) {
    ev.preventDefault();
    loading = true;
    message = "";
    const res = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.error) {
      message = body?.error?.message || body?.message || "Invalid email or password";
      loading = false;
      return;
    }
    await goto(data.next || "/admin", { invalidateAll: true });
  }
</script>

<svelte:head>
  <title>Admin Login</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center bg-[#1117] p-6 backdrop-blur-lg">
  <form
    class="grid w-full max-w-sm gap-6 rounded-2xl border bg-card/90 p-6 shadow-xl"
    method="POST"
    onsubmit={submit}
  >
    <div class="flex flex-col items-center gap-2 text-center">
      <a href="/" class="flex size-10 items-center justify-center rounded-md">
        <UserLock class="size-7" />
        <span class="sr-only">Buzzy</span>
      </a>
      <h1 class="text-xl font-bold">Welcome to Buzzy.</h1>
      <p class="text-sm text-muted-foreground">
        Sign in with an admin account to continue.
      </p>
    </div>

    <label class="grid gap-1">
      <span class="text-sm font-medium">Email</span>
      <Input
        bind:value={email}
        name="email"
        type="email"
        autocomplete="email"
        placeholder="m@example.com"
        required
      />
    </label>

    <label class="grid gap-1">
      <span class="text-sm font-medium">Password</span>
      <Input
        bind:value={password}
        name="password"
        type="password"
        autocomplete="current-password"
        required
      />
    </label>

    {#if message}
      <p class="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
        {message}
      </p>
    {/if}

    <Button type="submit" disabled={loading} class="w-full">
      {#if loading}
        <Loader2 class="animate-spin" />
      {:else}
        Login
      {/if}
    </Button>
  </form>
</div>
