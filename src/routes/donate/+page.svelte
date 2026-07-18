<script lang="ts">
  import { QrCode, Send, Upload } from "lucide-svelte";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import { Button } from "$lib/components/ui/button";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let type = $state<"tmn" | "pp">("tmn");
  let artifact = $state(false);
</script>

<svelte:head>
  <title>โดเนท</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center">
  <section class="w-full max-w-md rounded-md border bg-card p-5">
    <div class="relative aspect-[304.5/30] w-full">
      <a href="/">
        <FadeImage
          src="/logos/donate.webp"
          alt="Donate Logo"
          class="absolute left-1/2 w-3/4 -translate-x-1/2 -translate-y-2/3"
        />
      </a>
    </div>

    <form method="POST" enctype="multipart/form-data" class="mt-8 flex flex-col gap-4">
      <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-end">
        <label
          class="flex aspect-square w-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background/40 text-sm text-muted-foreground"
        >
          <Upload class="size-5" />
          รูปขึ้นจอ
          <input class="hidden" name="image" type="file" accept="image/*" />
        </label>
        <div class="grid w-full grow gap-4 [&>label]:-mb-2">
          <label class="grid gap-2">
            <span>ชื่อ <small class="text-muted-foreground">ไม่จำเป็น</small></span>
            <input
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              name="name"
              placeholder="Anonymous"
            />
          </label>
          <label class="grid gap-2">
            <span>
              จำนวนโดเนท
              <small class="text-muted-foreground">ขึ้นจอขั้นต่ำ 10 บาท</small>
            </span>
            <input
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              name="amount"
              inputmode="decimal"
              type="number"
              min="1"
              max="10000"
              placeholder="ขั้นต่ำ 1 บาท"
              required
            />
          </label>
        </div>
      </div>

      <label class="grid gap-2">
        <span>ข้อความ <small class="text-muted-foreground">สูงสุด 500 ตัวอักษร</small></span>
        <textarea
          class="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          name="message"
          placeholder="ข้อความ"
          maxlength="500"
        ></textarea>
      </label>

      {#if !data.artifactConfig.locked}
        <label class="flex items-center gap-2 rounded-md border p-3">
          <input
            type="checkbox"
            name="artifact"
            value="true"
            bind:checked={artifact}
          />
          ลัดคิวเสือกไอดีชาวบ้าน
        </label>
        {#if artifact}
          <label class="grid gap-2">
            <span>UID สำหรับเสือกไอดีชาวบ้าน</span>
            <input
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              name="uid"
              placeholder="814006303"
            />
          </label>
        {/if}
      {/if}

      <div class="grid gap-2">
        <span>วิธีการโอนเงิน</span>
        <div class="grid grid-cols-2 overflow-hidden rounded-md border">
          <label class="flex cursor-pointer items-center justify-center gap-2 p-2 {type === 'tmn' ? 'bg-accent' : ''}">
            <input class="sr-only" type="radio" name="type" value="tmn" bind:group={type} />
            <img src="/assets/tmn.webp" alt="" class="h-6 w-12 object-cover" />
            TrueMoney
          </label>
          <label class="flex cursor-pointer items-center justify-center gap-2 p-2 {type === 'pp' ? 'bg-accent' : ''}">
            <input class="sr-only" type="radio" name="type" value="pp" bind:group={type} />
            <QrCode class="size-6" />
            PromptPay
          </label>
        </div>
      </div>

      {#if type === "tmn"}
        <label class="grid gap-2">
          <span>ลิงก์อั่งเปา TrueMoney</span>
          <input
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            name="link"
            placeholder="https://gift.truemoney.com/campaign/?v=..."
          />
        </label>
      {:else}
        <div class="grid gap-3">
          <img
            src="/assets/promptpay.jpg"
            alt="PromptPay QR"
            class="mx-auto max-h-72 rounded-md border object-contain"
          />
          <label class="grid gap-2">
            <span>สลิปโอนเงิน</span>
            <input
              class="rounded-md border border-input bg-transparent px-3 py-2"
              name="slip"
              type="file"
              accept="image/*"
            />
          </label>
        </div>
      {/if}

      {#if form?.error}
        <p class="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          {form.error}
        </p>
      {:else if form?.success}
        <p class="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-2 text-sm text-emerald-300">
          ส่งเรียบร้อย
        </p>
      {/if}

      <Button type="submit" class="w-full">
        <Send />
        ส่งโดเนท
      </Button>
    </form>
  </section>
</div>
