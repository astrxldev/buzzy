<script lang="ts">
import { UserLock } from "lucide-svelte";
import { resolve } from "$app/paths";
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import type { ActionData, PageData } from "./$types";

let { data, form }: { data: PageData; form: ActionData } = $props();
let email = $state(form?.email || "");
let password = $state("");
</script>

<svelte:head>
  <title>Admin Login</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center bg-[#1117] p-6 backdrop-blur-lg">
  <form
    class="grid w-full max-w-sm gap-6 rounded-2xl border bg-card/90 p-6 shadow-xl"
    method="POST"
  >
    <input type="hidden" name="next" value={data.next || "/admin"} />

    <div class="flex flex-col items-center gap-2 text-center">
      <a href={resolve("/")} class="flex size-10 items-center justify-center rounded-md">
        <UserLock class="size-7" />
        <span class="sr-only">Buzzy</span>
      </a>
      <h1 class="text-xl font-bold">Welcome to Buzzy.</h1>
      <p class="text-sm text-muted-foreground">
        Sign in with an admin account to continue.
      </p>
      <p class="text-sm">
        Don't have an account?
        <a class="underline underline-offset-4" href="https://cdn.gunshiz.top/signup">Sign Up</a>
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

    {#if form?.message}
      <p class="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
        {form.message}
      </p>
    {/if}

    <Button type="submit" class="w-full">
      Login
    </Button>
  </form>
</div>
