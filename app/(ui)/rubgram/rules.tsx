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
          1. กรณีจ่ายเงินแล้วเล่นแล้วไม่ผ่านจริงๆจะคืนเงินคืน
          <br />
          2. เมื่อถึงคิวแล้วจะมีการเรียกตัวผ่านช่อง ยมบาลตามตัว หลังจากโดนแท็กแล้วให้ทักหาบุสทันที
          <br />
          3. หากไม่ทักภายใน 10 นาทีจะข้ามคิวไปก่อน ถ้ามาแล้วสามารถทักได้เลย
          <br />
          4. การกดตกลงจะถือว่ายอมรับ{" "}
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
