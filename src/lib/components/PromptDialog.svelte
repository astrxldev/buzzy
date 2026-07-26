<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Dialog from "$lib/components/ui/dialog";

  type Props = {
    open?: boolean;
    title: string;
    description: string;
    value?: string;
    confirmText?: string;
    onConfirm: (value: string) => void | Promise<void>;
  };

  let {
    open = $bindable(false),
    title,
    description,
    value = $bindable(""),
    confirmText = "บันทึก",
    onConfirm,
  }: Props = $props();
  let busy = $state(false);

  async function confirm() {
    busy = true;
    try {
      await onConfirm(value);
      open = false;
    } finally {
      busy = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content>
    <form onsubmit={(event) => { event.preventDefault(); void confirm(); }}>
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>
      </Dialog.Header>
      <Input class="mt-4" bind:value required autofocus />
      <Dialog.Footer class="mt-4">
        <Dialog.Close>
          {#snippet child({ props })}<Button type="button" variant="outline" {...props}>ยกเลิก</Button>{/snippet}
        </Dialog.Close>
        <Button type="submit" disabled={busy}>{confirmText}</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
