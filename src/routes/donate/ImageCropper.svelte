<script lang="ts">
  import { ImageUp, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";

  let input: HTMLInputElement;
  let image = $state<HTMLImageElement>();
  let sourceUrl = $state("");
  let previewUrl = $state("");
  let filename = $state("donation-image.jpg");
  let croppedFile: File | undefined;
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let open = $state(false);

  function captureInput(node: HTMLInputElement) {
    input = node;
  }

  function captureImage(node: HTMLImageElement) {
    image = node;
  }

  function revoke(url: string) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }

  function selectFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    revoke(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    filename = file.name;
    croppedFile = undefined;
    setInputFile();
    zoom = 1;
    panX = 0;
    panY = 0;
    open = true;
  }

  function remove() {
    revoke(sourceUrl);
    revoke(previewUrl);
    sourceUrl = "";
    previewUrl = "";
    croppedFile = undefined;
    setInputFile();
  }

  function setInputFile(file?: File) {
    const transfer = new DataTransfer();
    if (file) transfer.items.add(file);
    input.files = transfer.files;
  }

  function applyCrop() {
    if (!image) return;
    const side = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    canvas.getContext("2d")?.drawImage(
      image,
      ((image.naturalWidth - side) / 2) * (panX + 1),
      ((image.naturalHeight - side) / 2) * (panY + 1),
      side,
      side,
      0,
      0,
      512,
      512,
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], filename.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
      croppedFile = file;
      setInputFile(file);
      revoke(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      open = false;
    }, "image/jpeg", 0.9);
  }
</script>

<div class="relative inline-flex">
  <button
    class="relative flex size-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-input bg-background/40 transition hover:bg-accent/50 sm:size-32"
    type="button"
    aria-label={previewUrl ? "Change donation image" : "Upload donation image"}
    onclick={() => input.click()}
  >
    {#if previewUrl}
      <img class="size-full object-cover" src={previewUrl} alt="Donation preview" />
    {:else}
      <span class="flex flex-col items-center gap-2 text-xs text-muted-foreground"><ImageUp class="size-7" />รูปขึ้นจอ</span>
    {/if}
  </button>
  {#if previewUrl}
    <Button class="absolute -top-2 -right-2 rounded-full" type="button" size="icon-sm" aria-label="Remove image" onclick={remove}>
      <X class="size-3.5" />
    </Button>
  {/if}
  <input {@attach captureInput} class="sr-only" name="image" type="file" accept="image/*" onchange={selectFile} />
</div>

<Dialog.Root bind:open>
  <Dialog.Content class="gap-3 sm:max-w-xl">
    <Dialog.Header>
      <Dialog.Title>จัดตำแหน่งรูปขึ้นจอ</Dialog.Title>
      <Dialog.Description>ภาพจะถูกตัดเป็นสี่เหลี่ยมจัตุรัสก่อนส่ง</Dialog.Description>
    </Dialog.Header>
    {#if sourceUrl}
      <div class="mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg bg-black">
        <img
          {@attach captureImage}
          class="size-full object-cover transition-transform"
          style={`object-position: ${(panX + 1) * 50}% ${(panY + 1) * 50}%; transform: scale(${zoom})`}
          src={sourceUrl}
          alt="Crop preview"
        />
      </div>
    {/if}
    <div class="flex items-center gap-3">
      <ZoomOut class="size-4 text-muted-foreground" />
      <input class="w-full accent-primary" type="range" min="1" max="3" step="0.05" bind:value={zoom} aria-label="Zoom image" />
      <ZoomIn class="size-4 text-muted-foreground" />
      <Button type="button" size="icon-sm" variant="outline" aria-label="Reset crop" onclick={() => { zoom = 1; panX = 0; panY = 0; }}><RotateCcw /></Button>
    </div>
    <label class="grid grid-cols-[5rem_1fr] items-center gap-3 text-xs text-muted-foreground">
      แนวนอน
      <input class="w-full accent-primary" type="range" min="-1" max="1" step="0.01" bind:value={panX} />
    </label>
    <label class="grid grid-cols-[5rem_1fr] items-center gap-3 text-xs text-muted-foreground">
      แนวตั้ง
      <input class="w-full accent-primary" type="range" min="-1" max="1" step="0.01" bind:value={panY} />
    </label>
    <Dialog.Footer>
      <Button type="button" variant="outline" onclick={() => (open = false)}>ยกเลิก</Button>
      <Button type="button" onclick={applyCrop}>ใช้รูปนี้</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
