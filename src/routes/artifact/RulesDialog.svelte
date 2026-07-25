<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { resolve } from "$app/paths";

  let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>กฏการลงคิว</Dialog.Title>
    </Dialog.Header>
    <p class="leading-6">
      1. คิวจะใช้ระบบเรียงแต่ถ้ามีโดเนทลัดคิวมาจะดูไอดีที่โดเนทมาก่อน<br />
      2. คิวจะมีการลบใหม่หมดทุกครั้งหลังจบสตรีม (ต้องลงใหม่ทุกครั้ง)<br />
      3. สำหรับการลงคิวฟรีจะดูให้แค่<u class="text-red-500">ตัวละครเดียว</u>
      แต่ถ้าโดเนทลัดคิว จะดูได้สูงสุด 8 ตัวละคร<br />
      4. โดยการกดตกลงจะถือเป็นการยอมรับ
      <a class="text-blue-500 underline" href="https://sudloh.com/privacy">Privacy policy</a><br />
      5. ถ้าจะลัดคิวให้โดเนทผ่าน
      <a class="text-blue-500 underline" href={resolve("/donate")} target="_blank" rel="noreferrer">ตรงนี้</a>
      เพื่อลัดคิว
    </p>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props })}
          <Button variant="outline" {...props}>ตกลง</Button>
        {/snippet}
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
