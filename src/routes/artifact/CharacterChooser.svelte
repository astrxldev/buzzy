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
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import Check from "lucide-svelte/icons/check";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import CharacterCard from "$lib/components/CharacterCard.svelte";

  type Character = {
    label: string;
    value: string;
    amber: string;
    image: string;
    stars?: 4 | 5;
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
  let pickerOpen = $state(false);
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
    type="text"
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
    <input id="character" name="character" type="hidden" value={selected} required />
    <Popover.Root bind:open={pickerOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" role="combobox" class="w-full justify-between font-normal">
            {characters.find((character) => character.value === selected)?.label || "ค้นหาตัวละคร"}
            <ChevronsUpDown class="size-4 opacity-50" />
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="w-[var(--bits-popover-trigger-width)] p-0">
        <Command.Root>
          <Command.Input placeholder="ค้นหาตัวละคร..." />
          <Command.List class="max-h-72">
            <Command.Empty>ไม่พบตัวละคร</Command.Empty>
            <Command.Group>
              {#each characters as character (character.value)}
                <Command.Item
                  value={character.value}
                  onSelect={() => {
                    selected = character.value;
                    pickerOpen = false;
                  }}
                >
                  {character.label}
                  {#if selected === character.value}<Check class="ml-auto size-4" />{/if}
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>
  {:else}
    <input id="character" name="character" type="hidden" value={selected} />
    <div class="flex min-h-[100.8px] gap-2 overflow-x-auto pb-2">
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
            class="h-[100.8px] w-[76.8px] shrink-0 rounded-md"
            type="button"
            title={character.label}
            onclick={() => (selected = character.value)}
          ><CharacterCard char={{ name: character.label, image: character.image, stars: character.stars ?? null }} scale={0.6} selected={selected === character.value} /></button>
        {/each}
      {:else}
        {#each { length: 5 } as _, index (index)}
          <div class="h-[100.8px] w-[76.8px] shrink-0 rounded-md bg-muted"></div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<AlertDialog.Root bind:open={guideOpen}>
  <AlertDialog.Content class="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
    <AlertDialog.Title>วิธีแก้ไขตัวละครไม่ขึ้น</AlertDialog.Title>
    <div class="flex flex-col gap-2">
      <p class="text-center">ในเกม เปิด<b>เมนูเกม</b>แล้วไปที่ <b>แก้ไขข้อมูลส่วนตัว</b></p>
      <img class="rounded-md border-2 border-foreground" src="/guide/1.png" alt="เมนูแก้ไขข้อมูลส่วนตัว" />
      <p class="text-center">ใส่ตัวละครที่ต้องการ แล้วเปิด "<b>แสดงรายละเอียดตัวละคร</b>"</p>
      <img class="rounded-md border-2 border-foreground" src="/guide/2.png" alt="เปิดแสดงรายละเอียดตัวละคร" />
      <p class="ml-[60%] md:ml-[65%]">อย่าลืมเปิด ↑</p>
      <p class="text-center">ออกจากเกมเพื่อให้ข้อมูลอัพเดท แล้วกดรีโหลด</p>
    </div>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>
        {#snippet child({ props })}<Button variant="outline" {...props}>ปิดหน้าต่าง</Button>{/snippet}
      </AlertDialog.Cancel>
      <Button type="button" disabled={refreshing || seconds > 0} onclick={() => fetchShowcase(true)}>
        {#if refreshing}<Loader2 class="animate-spin" />{:else}<UserSearch />{/if}
        {seconds > 0 ? `รีโหลดใหม่ (${seconds})` : "รีโหลดใหม่"}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
