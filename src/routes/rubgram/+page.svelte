<script lang="ts">
  import {
    AlertCircle,
    BookAlert,
    CircleDollarSign,
    Download,
    List,
    LogIn,
    Plus,
    SendHorizonal,
    X,
  } from "lucide-svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { invalidateAll } from "$app/navigation";
  import { enhance } from "$app/forms";
  import Blocker from "$lib/components/Blocker.svelte";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import { Button } from "$lib/components/ui/button";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let selectedServices = $state<string[]>([]);
  let rulesAccepted = $state(false);
  let forceRules = $state(false);
  let showList = $state(false);
  let slipSelected = $state(false);
  const showRules = $derived(
    (!data.q && !!data.session && !rulesAccepted) || forceRules,
  );

  const estimate = $derived.by(() => {
    if (data.config.free > 0) return 0;
    const total = selectedServices.reduce(
      (sum, id) =>
        sum + (data.config.types.find((type) => type.id === id)?.price || 0),
      0,
    );
    return data.config.types.every((type) => selectedServices.includes(type.id))
      ? Math.max(0, total - data.config.allDiscount)
      : total;
  });

  const serverLabels: Record<string, string> = {
    as: "Asia",
    eu: "Europe",
    us: "America",
    tw: "TW, HK, MO",
  };

  function downloadQr() {
    fetch("/assets/promptpay_full.jpg")
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "qrcode.jpg";
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  const enhanced: SubmitFunction = () => {
    return async ({ update, result }) => {
      await update();
      if (result.type === "success") await invalidateAll();
    };
  };
</script>

<svelte:head>
  <title>รับกรรมแทนทางบ้าน</title>
  <meta name="description" content="รับเล่นคอนเทนต์เอนเกมเกนชินแทนคนดู" />
</svelte:head>

<div class="flex h-svh flex-col items-center justify-center gap-2">
  <section class="relative w-full max-w-md rounded-xl border bg-card py-6 shadow-sm">
    {#if data.q && data.q.paid}
      <Blocker>
        <div class="flex flex-col items-center gap-1">
          <span class="text-3xl font-bold">คิวของคุณคือหมายเลข</span>
          <span class="text-5xl font-bold">{data.q.queue}</span>
          {#if data.canExpire}
            <span class="flex items-center gap-1 text-muted-foreground">
              <Tooltip text="มีบางคิวก่อนหน้าของคุณยังไม่ได้ชำระเงิน">
                <AlertCircle size={16} />
              </Tooltip>
              เลขคิวของคุณอาจมีการเปลื่ยนแปลง
            </span>
          {/if}
        </div>
        <div class="absolute right-0 bottom-0 m-2 flex gap-2">
          <Button variant="outline" size="sm" type="button" onclick={() => (showList = true)}>
            <List /> รายการคิว
          </Button>
          <Button variant="outline" size="sm" href="/rubgram?new">
            <Plus /> ลงคิวเพิ่ม
          </Button>
        </div>
      </Blocker>
    {:else if !data.q && data.config.locked}
      <Blocker>
        <span class="text-3xl font-bold">ยังไม่เปิดรับคิว</span>
      </Blocker>
    {:else if !data.q && data.config.full}
      <Blocker>
        <span class="text-3xl font-bold">คิวเต็มแล้ว</span>
      </Blocker>
    {:else if !data.q && !data.session}
      <Blocker>
        <div class="grid gap-2">
          โปรดล็อคอินผ่าน Discord เพื่อดำเนินการต่อ
          <Button href="/rubgram/login">
            <span class="flex w-full items-center justify-between">
              ล็อคอินผ่าน Discord
              <LogIn />
            </span>
          </Button>
        </div>
      </Blocker>
    {:else if !data.q && showRules}
      <Blocker>
        <div class="grid max-w-sm gap-3 rounded border bg-card/95 p-4 text-left">
          <h2 class="text-xl font-bold">กฎการลงคิว</h2>
          <p class="text-sm text-muted-foreground">
            ลงคิวด้วย Discord, เลือกบริการและเซิร์ฟเวอร์ให้ถูกต้อง แล้วชำระเงินภายในเวลาที่กำหนด
          </p>
          <Button
            type="button"
            onclick={() => {
              rulesAccepted = true;
              forceRules = false;
            }}
          >
            ดำเนินการต่อ
          </Button>
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
            src="/logos/rubgram.webp"
            alt="รับกรรมแทนทางบ้าน"
          />
        </a>
      </div>
    </header>

    <div class="px-6">
      {#if data.q && !data.q.paid}
        <form method="POST" action="?/payment" enctype="multipart/form-data" id="mainform" use:enhance={enhanced}>
          <div class="flex flex-col items-center gap-2">
            <div class="flex w-full gap-2">
              <FadeImage
                src="/assets/promptpay.jpg"
                alt="Promptpay QR Code"
                class="max-w-32 shrink-0 rounded"
              />
              <div class="relative flex shrink-0 flex-col">
                <span class="text-lg font-bold">ยอดชำระ {data.q.price} บาท</span>
                <span class="text-sm text-muted-foreground">ผู้รับ: นาย พัชรพล พลพันธุ์</span>
                <span class="text-sm text-muted-foreground">บัญชี: xxx-x-x8666-x</span>
                <span class="text-sm text-muted-foreground">เลขที่อ้างอิง: 004999056945438</span>
                <Button class="w-full" size="sm" type="button" onclick={downloadQr} variant="ghost">
                  <Download /> ดาวน์โหลด QR Code
                </Button>
              </div>
            </div>
            <label
              class={[
                "inline-flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-destructive px-3 text-sm font-medium text-white",
                slipSelected && "bg-emerald-600!",
              ]}
            >
              {slipSelected ? "เลือกสลิปแล้ว" : "อัพโหลดสลิป"}
              <input
                type="file"
                name="slip"
                accept="image/*"
                required
                hidden
                onchange={(ev) =>
                  (slipSelected = !!(ev.currentTarget as HTMLInputElement).files?.length)}
              />
            </label>
          </div>
          <input hidden name="sid" readonly value={data.q.id} />
        </form>
      {:else}
        <form method="POST" action="?/registration" id="mainform" use:enhance={enhanced}>
          <div class="flex flex-col gap-3">
            <label class="grid gap-2">
              <span>ชื่อ*</span>
              <input
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                id="name"
                name="name"
                type="text"
                placeholder={data.session?.display || "Mr. Buzz"}
                autocomplete="name"
                maxlength="32"
                required
              />
            </label>
            <label class="grid gap-2">
              <span>เซิร์ฟเวอร์*</span>
              <select
                class="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 shadow-xs outline-none"
                name="server"
                required
              >
                <option value="">เลือกเซิร์ฟเวอร์ที่คุณอยู่</option>
                <option value="as">Asia</option>
                <option value="us">America</option>
                <option value="eu">Europe</option>
                <option value="tw">TW, HK, MO</option>
              </select>
            </label>
            <div class="grid gap-2">
              <span>บริการ*</span>
              <div class="grid gap-2 rounded-md border p-2">
                {#each data.config.types as type}
                  <label class="flex items-center justify-between gap-2 rounded-sm p-2 hover:bg-accent">
                    <span class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="service"
                        value={type.id}
                        bind:group={selectedServices}
                      />
                      {type.display}
                    </span>
                    <kbd class="rounded border bg-muted px-1.5 text-xs">
                      {#if data.config.free > 0}
                        <span class="line-through opacity-50">{type.price}</span>
                        <span class="text-emerald-500"> ฟรี</span>
                      {:else}
                        {type.price} <span class="opacity-50">บาท</span>
                      {/if}
                    </kbd>
                  </label>
                {/each}
              </div>
              <span class="-mt-1 text-xs text-muted-foreground">
                เลือกทั้ง {data.config.types.length} อย่าง ลดให้ {data.config.allDiscount} บาท
              </span>
            </div>
          </div>
          <input hidden name="user" readonly value={data.session?.uid || ""} />
        </form>
      {/if}
    </div>

    {#if form?.error}
      <p class="mx-6 mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
        {form.error}
      </p>
    {/if}

    <footer class="mt-6 flex justify-between gap-2 px-6">
      <div class="flex gap-2">
        <Tooltip text="ลัดคิว 50 บาท (ไม่รวมยอดที่ต้องจ่าย)">
          <Button
            variant="outline"
            class={data.config.limit >= 0 && data.config.count >= data.config.limit
              ? "animate-pulse border-white! bg-emerald-600!"
              : ""}
            href="/donate"
            target="_blank"
            rel="noreferrer"
          >
            <CircleDollarSign />
          </Button>
        </Tooltip>
        <Tooltip text="อ่านกฏการลงคิว">
          <Button variant="destructive" type="button" onclick={() => (forceRules = true)}>
            <BookAlert />
          </Button>
        </Tooltip>
        {#if data.q}
          <form method="POST" action="?/cancel" use:enhance={enhanced}>
            <input hidden name="sid" value={data.q.id} />
            <Button variant="destructive" type="submit">
              <X /> ยกเลิก
            </Button>
          </form>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        {#if !data.q}
          <kbd class="rounded border bg-muted px-1.5 text-xs">ทั้งหมด {estimate} บาท</kbd>
        {/if}
        <kbd class="rounded border bg-muted px-1.5 text-xs">
          {data.config.count} / {data.config.limit < 0 ? "∞" : data.config.limit} คิว
        </kbd>
        <Tooltip text="ถัดไป">
          <Button
            type="submit"
            form="mainform"
            disabled={data.q?.paid ||
              data.config.locked ||
              (data.config.limit >= 0 && data.config.count >= data.config.limit)}
          >
            <SendHorizonal />
          </Button>
        </Tooltip>
      </div>
    </footer>
  </section>

  <span class="m-1 rounded-sm border p-1 text-xs">
    หากติดปัญหา โปรดแจ้งผ่านทาง
    <a href="https://discord.gg/HQwDXNhxuK" class="text-green-200 underline">
      ช่องดิสคอร์ด
    </a>
  </span>
</div>

{#if showList}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
    <div class="max-h-[80svh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xl font-bold">รายการคิวของฉัน</h2>
        <Button size="icon" variant="ghost" onclick={() => (showList = false)}>
          <X />
        </Button>
      </div>
      <div class="flex flex-col gap-2">
        {#if data.userSubs.length === 0}
          <p class="text-sm text-muted-foreground">ไม่มีรายการคิว</p>
        {/if}
        {#each data.userSubs as item}
          <form method="POST" action="?/select" use:enhance={enhanced}>
            <input hidden name="sid" value={item.id} />
            <button
              type="submit"
              class="flex w-full cursor-pointer items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent"
            >
              <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="truncate font-medium">{item.queue}. {item.name}</span>
                <span class="truncate text-xs text-muted-foreground">
                  {item.services.join(", ")}
                </span>
                <div class="flex items-center gap-2 text-xs">
                  <span class="rounded border px-1">{serverLabels[item.server]}</span>
                  <span class="font-medium">{item.price} ฿</span>
                  {#if item.paid}
                    <span class="text-green-500">ชำระแล้ว</span>
                  {:else}
                    <span class="text-yellow-500">รอชำระ</span>
                  {/if}
                </div>
              </div>
            </button>
          </form>
        {/each}
      </div>
    </div>
  </div>
{/if}
