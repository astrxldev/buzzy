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
          1. คิวจะใช้ระบบเรียงแต่ถ้ามีโดเนทลัดคิวมาจะดูไอดีที่โดเนทมาก่อน
          <br />
          2. คิวจะมีการลบใหม่หมดทุกครั้งหลังจบสตรีม (ต้องลงใหม่ทุกครั้ง)
          <br /> 3. สำหรับการลงคิวฟรีจะดูให้แค่
          <u className="text-red-500">ตัวละครเดียว</u> แต่ถ้าโดเนทลัดคิว
          จะดูได้สูงสุด 8 ตัวละคร
          <br />
          4. โดยการกดตกลงจะถือเป็นการยอมรับ{" "}
          <span className="text-blue-500 underline">
            <Link href="https://sudloh.com/privacy">Privacy policy</Link>
          </span>
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
