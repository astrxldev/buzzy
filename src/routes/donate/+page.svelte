<script lang="ts">
  import { Check, Download, LoaderCircle, QrCode, Send } from "lucide-svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import type { ActionData, PageData } from "./$types";
  import ImageCropper from "./ImageCropper.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let type = $state<"tmn" | "pp">("tmn");
  let artifact = $state(false);
  let amount = $state<number | undefined>(undefined);
  let message = $state("");
  let link = $state("");
  let uid = $state("");
  let slipName = $state("");
  let submitting = $state(false);
  let cropKey = $state(0);
  let formElement: HTMLFormElement;
  const amountFeedback = $derived(amount !== undefined && amount < 10 ? "ยอดต่ำกว่า 10 บาทจะไม่ขึ้นจอ" : "");

  function captureForm(node: HTMLFormElement) {
    formElement = node;
  }

  function downloadQr() {
    fetch("/assets/promptpay_full.jpg")
      .then((response) => response.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "promptpay-qr.jpg";
        anchor.click();
        URL.revokeObjectURL(url);
      });
  }

  const submit: SubmitFunction = () => {
    submitting = true;
    return async ({ result, update }) => {
      await update({ reset: false });
      submitting = false;
      if (result.type !== "success") return;
      formElement.reset();
      type = "tmn";
      artifact = false;
      amount = undefined;
      message = "";
      link = "";
      uid = "";
      slipName = "";
      cropKey += 1;
    };
  };
</script>

<svelte:head>
  <title>โดเนท</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center">
  <Card.Root class="w-full max-w-md p-5">
    <div class="relative aspect-[304.5/30] w-full">
      <a href={resolve("/")}>
        <FadeImage
          src="/logos/donate.webp"
          alt="Donate Logo"
          class="absolute left-1/2 w-3/4 -translate-x-1/2 -translate-y-2/3"
        />
      </a>
    </div>

    <Card.Content class="mt-8 p-0">
    <form {@attach captureForm} method="POST" enctype="multipart/form-data" class="flex flex-col gap-4" use:enhance={submit}>
      <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-end">
        {#key cropKey}<ImageCropper />{/key}
        <div class="grid w-full grow gap-4 [&>label]:-mb-2">
          <Label class="grid gap-2">
            ชื่อ <small class="text-muted-foreground">ไม่จำเป็น</small>
            <Input
              name="name"
              placeholder="Anonymous"
            />
          </Label>
          <Label class="grid gap-2">
            <span>
              จำนวนโดเนท
              <small class="text-muted-foreground">ขึ้นจอขั้นต่ำ 10 บาท</small>
            </span>
            <Input
              name="amount"
              inputmode="decimal"
              type="number"
              min="1"
              max="10000"
              placeholder="ขั้นต่ำ 1 บาท"
              bind:value={amount}
              required
            />
            {#if amountFeedback}<small class="text-amber-400">{amountFeedback}</small>{/if}
          </Label>
        </div>
      </div>

      <Label class="grid gap-2">
        <span>ข้อความ <small class="text-muted-foreground">สูงสุด 500 ตัวอักษร</small></span>
        <Textarea
          name="message"
          placeholder="ข้อความ"
          maxlength={500}
          bind:value={message}
        />
        <small class="text-right text-muted-foreground">{message.length}/500</small>
      </Label>

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
          <Label class="grid gap-2">
            <span>UID สำหรับเสือกไอดีชาวบ้าน</span>
            <Input
              name="uid"
              placeholder="814006303"
              pattern="[1-9][0-9]{8}"
              bind:value={uid}
              required
            />
          </Label>
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
          <Input
            name="link"
            placeholder="https://gift.truemoney.com/campaign/?v=..."
            bind:value={link}
            required
          />
          {#if link && !link.startsWith("https://gift.truemoney.com/")}
            <small class="text-amber-400">โปรดตรวจสอบว่าเป็นลิงก์อั่งเปา TrueMoney</small>
          {/if}
        </label>
      {:else}
        <div class="grid gap-3">
          <div class="flex gap-3 rounded-md border p-3">
            <img src="/assets/promptpay.jpg" alt="PromptPay QR" class="max-w-32 shrink-0 rounded object-contain" />
            <div class="flex min-w-0 flex-col text-sm">
              <b>บัญชีรับโดเนท</b>
              <span class="text-muted-foreground">ผู้รับ: นาย พัชรพล พลพันธุ์</span>
              <span class="text-muted-foreground">บัญชี: xxx-x-x8666-x</span>
              <span class="text-muted-foreground">เลขที่อ้างอิง: 004999056945438</span>
              <Button class="mt-auto" size="sm" type="button" variant="ghost" onclick={downloadQr}><Download /> ดาวน์โหลด QR Code</Button>
            </div>
          </div>
          <label class="grid gap-2">
            <span>สลิปโอนเงิน</span>
            <span class={["flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2", slipName && "border-emerald-500 text-emerald-300"]}>
              {#if slipName}<Check class="size-4" /> {slipName}{:else}เลือกสลิปโอนเงิน{/if}
              <Input class="sr-only" name="slip" type="file" accept="image/*" required onchange={(event) => (slipName = event.currentTarget.files?.[0]?.name ?? "")} />
            </span>
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

      <Button type="submit" class="w-full" disabled={submitting}>
        {#if submitting}<LoaderCircle class="animate-spin" />กำลังตรวจสอบการชำระเงิน{:else}<Send />ส่งโดเนท{/if}
      </Button>
    </form>
    </Card.Content>
  </Card.Root>
</div>
