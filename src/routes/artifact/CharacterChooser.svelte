<script lang="ts">
  import {
    CircleX,
    Loader2,
    Search,
    UserSearch,
    Wrench,
  } from "lucide-svelte";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Dialog from "$lib/components/ui/dialog";

  type Character = {
    label: string;
    value: string;
    amber: string;
    image: string;
  };
  type EnkaResult = {
    message?: string;
    ttl?: number;
    playerInfo?: { showAvatarInfoList?: { avatarId: number }[] };
  };

  let {
    characters,
    uid = $bindable(""),
    selected = $bindable(""),
    guideOpen = $bindable(false),
  }: {
    characters: Character[];
    uid?: string;
    selected?: string;
    guideOpen?: boolean;
  } = $props();

  let manual = $state(false);
  let loading = $state(false);
  let loadError = $state("");
  let showcase = $state<Character[]>([]);
  let request = 0;
  let refreshing = $state(false);
  let cacheUntil = $state(0);
  let now = $state(Date.now());
  let seconds = $derived(Math.max(0, Math.ceil((cacheUntil - now) / 1000)));

  function errorMessage(data: EnkaResult) {
    if (data.message === "This player does not exist.") return "ไม่พบผู้เล่นที่มี UID นี้";
    if (!data.playerInfo?.showAvatarInfoList) return "UID นี้ไม่มีตัวละครที่จัดแสดงเป็นสาธารณะ";
    return "";
  }

  async function fetchShowcase(isRepair = false) {
    const current = ++request;
    if (!/^\d{9,10}$/.test(uid)) {
      showcase = [];
      loadError = "";
      loading = false;
      return;
    }
    loading = !isRepair;
    refreshing = isRepair;
    loadError = "";
    try {
      const response = await fetch(`/api/enka/${uid}`);
      const data = (await response.json()) as EnkaResult;
      if (current !== request) return;
      const error = errorMessage(data);
      if (!response.ok || error) {
        showcase = [];
        loadError = error || "เกิดข้อผิดพลาดในการดึงข้อมูล";
      } else {
        const ids = new Set(data.playerInfo!.showAvatarInfoList!.map((item) => `${item.avatarId}`));
        showcase = characters.filter((character) => ids.has(character.amber.split("-")[0]));
        if (!showcase.some((character) => character.value === selected)) selected = "";
        if (isRepair) guideOpen = false;
      }
      if (isRepair && data.ttl) cacheUntil = Date.now() + data.ttl * 1000;
    } catch {
      if (current === request) loadError = "ข้อผิดพลาดภายในระบบ";
    } finally {
      if (current === request) {
        loading = false;
        refreshing = false;
      }
    }
  }

  function uidInput() {
    void fetchShowcase();
  }

  onMount(() => {
    if (/^\d{9,10}$/.test(uid)) void fetchShowcase();
    const interval = window.setInterval(() => (now = Date.now()), 1000);
    return () => window.clearInterval(interval);
  });
</script>

<label class="grid gap-2">
  <span>UID*</span>
  <Input
    id="uid"
    name="uid"
    type="number"
    required
    placeholder="814006303"
    bind:value={uid}
    oninput={uidInput}
  />
</label>

<div class="grid gap-2">
  <div class="flex items-center justify-between gap-2 text-sm">
    <label for="character">เลือกตัวละครที่ต้องการ</label>
    <button class="underline" type="button" onclick={() => (manual = !manual)}>
      {manual ? "เลือกจากลิสต์" : "หาไม่เจอ? เลือกเอง"}
    </button>
  </div>

  {#if manual}
    <Input
      id="character"
      name="character"
      list="artifact-characters"
      placeholder="ค้นหาตัวละคร"
      required
      bind:value={selected}
    />
    <datalist id="artifact-characters">
      {#each characters as character (character.value)}
        <option value={character.value}>{character.label}</option>
      {/each}
    </datalist>
  {:else}
    <input id="character" name="character" type="hidden" value={selected} />
    <div class="flex min-h-[100px] gap-2 overflow-x-auto pb-2">
      {#if loadError}
        <div class="flex w-full flex-col items-center justify-center gap-2 rounded-md bg-muted p-3 text-center">
          <span class="flex items-center gap-2"><CircleX class="text-red-500" />{loadError}</span>
          <Button type="button" variant="outline" size="sm" onclick={() => (guideOpen = true)}>
            <Wrench /> วิธีแก้ไข
          </Button>
        </div>
      {:else if loading}
        <div class="flex w-full items-center justify-center gap-2 rounded-md bg-muted">
          <Loader2 class="animate-spin" /> กำลังโหลดตัวละคร...
        </div>
      {:else if showcase.length}
        <button
          class="flex w-[77px] shrink-0 items-center justify-center rounded-md bg-muted"
          type="button"
          title="ค้นหาด้วยตัวเอง"
          onclick={() => (manual = true)}
        ><Search /></button>
        {#each showcase as character (character.value)}
          <button
            class={[
              "relative h-[100px] w-[77px] shrink-0 overflow-hidden rounded-md border-2 bg-muted",
              selected === character.value ? "border-primary" : "border-transparent",
            ]}
            type="button"
            title={character.label}
            onclick={() => (selected = character.value)}
          >
            <img class="h-full w-full object-cover" src={`/cdn/${character.image}`} alt={character.label} />
          </button>
        {/each}
      {:else}
        {#each { length: 5 } as _, index (index)}
          <div class="h-[100px] w-[77px] shrink-0 rounded-md bg-muted"></div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<Dialog.Root bind:open={guideOpen}>
  <Dialog.Content class="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
    <Dialog.Header><Dialog.Title>วิธีแก้ไขตัวละครไม่ขึ้น</Dialog.Title></Dialog.Header>
    <div class="flex flex-col gap-2 text-center">
      <p>ในเกม เปิด<b>เมนูเกม</b>แล้วไปที่ <b>แก้ไขข้อมูลส่วนตัว</b></p>
      <img class="rounded-md border-2 border-foreground" src="/guide/1.png" alt="เมนูแก้ไขข้อมูลส่วนตัว" />
      <p>ใส่ตัวละครที่ต้องการ แล้วเปิด "<b>แสดงรายละเอียดตัวละคร</b>"</p>
      <img class="rounded-md border-2 border-foreground" src="/guide/2.png" alt="เปิดแสดงรายละเอียดตัวละคร" />
      <p class="text-right">อย่าลืมเปิด ↑</p>
      <p>ออกจากเกมเพื่อให้ข้อมูลอัพเดท แล้วกดรีโหลด</p>
    </div>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props })}<Button variant="outline" {...props}>ปิดหน้าต่าง</Button>{/snippet}
      </Dialog.Close>
      <Button type="button" disabled={refreshing || seconds > 0} onclick={() => fetchShowcase(true)}>
        {#if refreshing}<Loader2 class="animate-spin" />{:else}<UserSearch />{/if}
        {seconds > 0 ? `รีโหลดใหม่ (${seconds})` : "รีโหลดใหม่"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
