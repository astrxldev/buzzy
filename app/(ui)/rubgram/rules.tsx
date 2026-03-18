import type * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
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
          1. เมื่อจ่ายเงินแล้วจะ<u className="text-red-500">ไม่สามารถขอคืนเงิน</u>
          ได้ทุกกรณีนะคับ
          <br />
          2. เมื่อถึงคิวแล้วจะมีการเรียกตัวผ่านช่อง ยมบาลตามตัว หลังจากโดนแท็กแล้วให้ทักหาบุสทันที
          <br />
          3. จะลงทั้งในไลฟ์และนอกไลฟ์ ควรเตรียมตัวให้พร้อมก่อนถึงคิว
          <br />
          4. หากไม่ทักภายใน 10 นาทีจะข้ามคิวไปก่อน ถ้ามาแล้วสามารถทักได้เลย
          <br />
          5. ไม่แนะนำให้ใช้ Truemoney จ่าย
          <br />
          6. การกดตกลงจะถือว่ายอมรับ{" "}
          <u className="text-blue-500">
            <Link href="https://sudloh.com/privacy">Privacy policy</Link>
          </u>
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
