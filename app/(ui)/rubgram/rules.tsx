import type * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RulesDialog({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & {
  children: React.ReactNode;
}) {
  return (
    <Dialog {...props}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>กฏการลงคิว</DialogTitle>
        </DialogHeader>
        <p>
          {" "}
          1. เมื่อจ่ายเงิน แล้วจะ<u className="text-red-500">ไม่สามารถขอคืนเงิน</u>ได้ทุกกรณีนะคับ
          <br />
          2. เมื่อถึงคิวแล้วจะมีการเรียกตัวผ่าน Discord ผ่านช่อง ยมบาลตามตัว หลังจากโดนแท็กแล้วให้ทักหาบุสทันที
          <br />
          3. จะลงทั้งในไลฟ์และนอกไลฟ์เพราะฉะนั้นควรเตรียมตัวให้พร้อมก่อนถึงคิว
          <br />
          4. หากไม่มาตามคิวที่ลงไว้ จะถูกข้ามคิวไปก่อน ถ้ากลับมาแล้วทักหาด้วย เดี๋ยวลืม
          <br />
          5. หากใช้ Turemoney แล้วสแกน PromptPay ไม่ได้ จะไม่สามารถลงคิวได้
          <br />
          6. จะมีเวลาให้สแกนจ่านเงิน 20 นาที หากเกินเวลาแล้วต้องลงคิวใหม่
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">ตกลง</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
