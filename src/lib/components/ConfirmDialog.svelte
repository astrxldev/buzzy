<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";

  type Props = {
    open?: boolean;
    title: string;
    description: string;
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
  };

  let {
    open = $bindable(false),
    title,
    description,
    confirmText = "ยืนยัน",
    onConfirm,
  }: Props = $props();
  let busy = $state(false);

  async function confirm() {
    busy = true;
    try {
      await onConfirm();
      open = false;
    } finally {
      busy = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>{description}</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props })}<Button variant="outline" {...props}>ยกเลิก</Button>{/snippet}
      </Dialog.Close>
      <Button variant="destructive" disabled={busy} onclick={confirm}>{confirmText}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
