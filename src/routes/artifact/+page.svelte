<script lang="ts">
  import {
    BookAlert,
    CircleDollarSign,
    Pencil,
    SendHorizonal,
  } from "lucide-svelte";
  import Blocker from "$lib/components/Blocker.svelte";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import { Button } from "$lib/components/ui/button";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const blocked = $derived(
    (!!data.submission ||
      data.config.locked ||
      (data.config.limit >= 0 && data.count >= data.config.limit)) &&
      !data.editing,
  );
</script>

<svelte:head>
  <title>เสือกไอดีชาวบ้าน</title>
  <meta
    name="description"
    content="ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม"
  />
</svelte:head>

<div class="flex h-svh items-center justify-around">
  <section class="relative w-full max-w-md rounded-xl border bg-card py-6 shadow-sm">
    {#if !data.editing && data.submission}
      <Blocker>
        <div class="flex flex-col items-center gap-1">
          <span class="text-3xl font-bold">คิวของคุณคือหมายเลข</span>
          <span class="text-5xl font-bold">{data.submission.queue}</span>
        </div>
        {#if data.submission.edits < 5 && !data.submission.checked}
          <Tooltip text="แก้ไข">
            <Button
              class="absolute right-0 bottom-0 m-2"
              variant="outline"
              size="icon"
              href={`?edit=${data.submission.editToken}`}
            >
              <Pencil />
            </Button>
          </Tooltip>
        {:else}
          <Button
            class="absolute right-0 bottom-0 m-2 bg-red-500/50!"
            variant="outline"
            disabled
          >
            <Pencil />
            แก้ไม่ได้แล้ว
          </Button>
        {/if}
      </Blocker>
    {:else if data.config.locked}
      <Blocker>
        <span class="text-3xl font-bold">ยังไม่เปิดรับคิว</span>
      </Blocker>
    {:else if data.config.limit >= 0 && data.count >= data.config.limit}
      <Blocker>
        <div class="flex flex-col items-center gap-1">
          <span class="text-3xl font-bold">คิวเต็มแล้ว</span>
          <span class="text-2xl font-bold">ต้องโดเนทลัดคิวแล้วล่ะ</span>
          <Tooltip text="โดเนทลัดคิว ขั้นต่ำ 10 บาท" side="bottom">
            <Button
              class="animate-pulse border-white! bg-emerald-600!"
              href="/donate"
              target="_blank"
              rel="noreferrer"
            >
              <CircleDollarSign />
            </Button>
          </Tooltip>
        </div>
      </Blocker>
    {/if}

    <header class="flex justify-center px-6">
      <div class="w-[276.5px]">
        <a href="/">
          <FadeImage
            style="transform: translateY(-70%)"
            class="absolute z-50"
            height="137.5"
            width="276.5"
            src="/logos/artifact.webp"
            alt="เสือกไอดีชาวบ้าน"
          />
        </a>
      </div>
    </header>

    <form method="POST" id="mainform" class="px-6">
      {#if data.editing && data.submission}
        <input type="hidden" name="editSub" value={data.submission.id} />
        <input type="hidden" name="editToken" value={data.submission.editToken} />
      {/if}
      <div class="flex flex-col gap-3">
        <label class="grid gap-2">
          <span>ชื่อ*</span>
          <input
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            id="name"
            name="name"
            type="text"
            placeholder="Mr.Buzz"
            autocomplete="name"
            maxlength="64"
            required
            value={data.editing ? data.submission?.name : ""}
          />
        </label>
        <label class="grid gap-2">
          <span>UID*</span>
          <input
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            id="uid"
            name="uid"
            type="number"
            required
            placeholder="814006303"
            maxlength="10"
            value={data.editing ? data.submission?.uid : ""}
          />
        </label>
        <label class="grid gap-2">
          <span>ตัวละคร*</span>
          <select
            class="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 shadow-xs outline-none transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            id="character"
            name="character"
            required
          >
            <option value="">ค้นหาตัวละคร</option>
            {#each data.clist as char}
              <option
                value={char.value}
                selected={data.editing && data.submission?.char === char.value}
              >
                {char.label}
              </option>
            {/each}
          </select>
        </label>
        <label class="grid gap-2">
          <span>ข้อความเพิ่มเติม</span>
          <textarea
            class="min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            id="comment"
            name="comment"
            placeholder="เช่น Er พอไหมครับ, คริสวยยังครับ (ไม่บังคับ)"
            maxlength="1024"
          >{data.editing ? data.submission?.comment : ""}</textarea>
        </label>
      </div>
    </form>

    {#if form?.error}
      <p class="mx-6 mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
        {form.error}
      </p>
    {/if}

    <footer class="mt-6 flex justify-between gap-2 px-6">
      <div class="flex gap-2">
        <Tooltip text="โดเนทลัดคิว ขั้นต่ำ 10 บาท">
          <Button variant="outline" href="/donate" target="_blank" rel="noreferrer">
            <CircleDollarSign />
          </Button>
        </Tooltip>
        <Tooltip text="อ่านกฏการลงคิว">
          <Button variant="destructive" type="button">
            <BookAlert />
          </Button>
        </Tooltip>
        {#if data.editing}
          <Button variant="destructive" href="/artifact">ยกเลิก</Button>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <kbd
          class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"
        >
          {data.count} / {data.config.limit < 0 ? "∞" : data.config.limit} คิว
        </kbd>
        <Tooltip text="ส่งเลยจัฟลูกพี่">
          <Button type="submit" form="mainform" disabled={blocked}>
            {#if data.editing}
              <Pencil />
            {:else}
              <SendHorizonal />
            {/if}
          </Button>
        </Tooltip>
      </div>
    </footer>
  </section>
</div>
