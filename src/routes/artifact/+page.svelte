<script lang="ts">
  import {
    BookAlert,
    CircleDollarSign,
    Pencil,
    SendHorizonal,
    TvMinimalPlay,
    Wrench,
  } from "lucide-svelte";
  import { onMount, untrack } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Blocker from "$lib/components/Blocker.svelte";
  import FadeImage from "$lib/components/FadeImage.svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import type { ActionData, PageData } from "./$types";
  import CharacterChooser from "./CharacterChooser.svelte";
  import RulesDialog from "./RulesDialog.svelte";
  import { checkEnkaStatus } from "./artifact.remote";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const blocked = $derived(
    (!!data.submission ||
      data.config.locked ||
      (data.config.limit >= 0 && data.count >= data.config.limit)) &&
      !data.editing,
  );
  type Warning = "nf" | "showcase" | "private" | null;
  type LiveInfo = {
    url: string;
    title: string;
    thumbnails: { url: string; width: number; height: number };
  };

  let uid = $state(untrack(() => (data.editing ? (data.submission?.uid ?? "") : "")));
  let selected = $state(untrack(() => (data.editing ? (data.submission?.char ?? "") : "")));
  let rulesOpen = $state(untrack(() => !blocked && !data.editing));
  let guideOpen = $state(false);
  let warning = $state<Warning>(null);
  let pendingForm = $state<HTMLFormElement>();
  let bypassWarning = false;
  let checking = $state(false);
  let clientError = $state("");
  let live = $state<LiveInfo | null>(null);

  function allowWarningBypass() {
    bypassWarning = true;
    window.setTimeout(() => (bypassWarning = false), 60000);
  }

  async function submit(event: SubmitEvent) {
    if (bypassWarning || !data.config.enka) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLFormElement;
    if (!target.reportValidity()) return;
    checking = true;
    clientError = "";
    try {
      const result = await checkEnkaStatus({ uid, character: selected, nonce: Date.now() });
      if (result) {
        pendingForm = target;
        warning = result;
        return;
      }
      allowWarningBypass();
      target.requestSubmit();
    } catch (error) {
      clientError = `เกิดข้อผิดพลาดในการตรวจสอบข้อมูล: ${error instanceof Error ? error.message : error}`;
    } finally {
      checking = false;
    }
  }

  function continueSubmit() {
    warning = null;
    allowWarningBypass();
    pendingForm?.requestSubmit();
  }

  onMount(() => {
    const source = new EventSource("/sse/artifact");
    source.addEventListener("update", () => void invalidateAll());
    void fetch("/api/live")
      .then((response) => response.json())
      .then((result: LiveInfo | "none") => {
        live = result === "none" ? null : result;
      })
      .catch(() => {});
    return () => source.close();
  });
</script>

<svelte:head>
  <title>เสือกไอดีชาวบ้าน</title>
  <meta
    name="description"
    content="ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม"
  />
  <meta property="og:title" content="เสือกไอดีชาวบ้าน" />
  <meta property="og:description" content="ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม" />
</svelte:head>

<div class="flex min-h-svh items-center justify-around px-2 py-16">
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
              href={resolve("/donate")}
              target="_blank"
              rel="noreferrer"
            >
              <CircleDollarSign />
            </Button>
          </Tooltip>
        </div>
      </Blocker>
    {:else if !data.editing}
      <Blocker>
        <Button variant="destructive" type="button" onclick={() => (rulesOpen = true)}>
          <BookAlert /> อ่านกฎ
        </Button>
      </Blocker>
    {/if}

    <header class="flex justify-center px-6">
      <div class="w-[276.5px]">
        <a href={resolve("/")}>
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

    <form method="POST" id="mainform" class="px-6" onsubmit={submit}>
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
        {#if data.config.enka}
          <CharacterChooser
            characters={data.characters}
            bind:uid
            bind:selected
            bind:guideOpen
          />
        {:else}
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
              bind:value={uid}
            />
          </label>
          <label class="grid gap-2">
            <span>ตัวละคร*</span>
            <input
              class="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 shadow-xs outline-none transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              id="character"
              name="character"
              list="artifact-character-list"
              placeholder="ค้นหาตัวละคร"
              required
              bind:value={selected}
            />
            <datalist id="artifact-character-list">
              {#each data.clist as char (char.value)}
                <option value={char.value}>{char.label}</option>
              {/each}
            </datalist>
          </label>
        {/if}
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

    {#if form?.error || clientError}
      <p class="mx-6 mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
        {form?.error || clientError}
      </p>
    {/if}

    <footer class="mt-6 flex justify-between gap-2 px-6">
      <div class="flex gap-2">
        <Tooltip text="โดเนทลัดคิว ขั้นต่ำ 10 บาท">
          <Button variant="outline" href={resolve("/donate")} target="_blank" rel="noreferrer">
            <CircleDollarSign />
          </Button>
        </Tooltip>
        <Tooltip text="อ่านกฏการลงคิว">
          <Button variant="destructive" type="button" onclick={() => (rulesOpen = true)}>
            <BookAlert />
          </Button>
        </Tooltip>
        {#if data.editing}
          <Button variant="destructive" href={resolve("/artifact")}>ยกเลิก</Button>
        {:else if live}
          <Tooltip text={live.title}>
            <Button variant="outline" href={live.url} target="_blank" rel="noreferrer">
              <TvMinimalPlay class="animate-pulse text-red-500" /> LIVE
            </Button>
          </Tooltip>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <kbd
          class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"
        >
          {data.count} / {data.config.limit < 0 ? "∞" : data.config.limit} คิว
        </kbd>
        <Tooltip text="ส่งเลยจัฟลูกพี่">
          <Button type="submit" form="mainform" disabled={blocked || checking}>
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

<RulesDialog bind:open={rulesOpen} />

<AlertDialog.Root open={warning !== null} onOpenChange={(open) => !open && (warning = null)}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>เดี๋ยวนะ</AlertDialog.Title>
      <AlertDialog.Description>
        {#if warning === "nf"}
          UID นี้ไม่มีอยู่จริง แน่เหรอว่าจะส่ง?
        {:else if warning === "showcase"}
          ตัวละครที่เลือกไม่ได้อยู่ในตั้งโชว์<br />ถ้าส่งก่อนใส่มันจะไม่ขึ้นนะ ไปแก้ก่อนมั้ย
        {:else}
          ใน UID นี้ไม่มีตัวละครอะไรตั้งโชว์อยู่เลย<br />ถ้าส่งก่อนใส่มันจะไม่ขึ้นนะ ไปแก้ก่อนมั้ย
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>ยกเลิก</AlertDialog.Cancel>
      <AlertDialog.Action variant="destructive" onclick={continueSubmit}>ยังไงก็จะส่ง</AlertDialog.Action>
      {#if warning !== "nf"}
        <Button
          type="button"
          onclick={() => {
            warning = null;
            guideOpen = true;
          }}
        ><Wrench /> วิธีแก้</Button>
      {/if}
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
