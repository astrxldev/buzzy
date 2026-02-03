import type * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "lucide-react";
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
          1. คิวจะใช้ระบบเรียง หรืออาจสุ่มบางครั้ง แต่ถ้ามีโดเนทลัดคิวมาจะดูไอดีที่โดเนทมาก่อน
          <br />
          2. คิวจะมีการลบใหม่หมดทุกครั้งหลังจบสตรีม (ต้องลงใหม่ทุกครั้งนะคับ)
          <br /> 3. สามารถดูให้ได้แค่
          <u className="text-red-500">ตัวละครเดียว</u>เท่านั้น แต่ถ้าโดเนทลัดคิว
          สามารถดูได้สูงสุด 8 ตัว
          <br />
          4. โดเนทขั้นต่ำ 10 บาท หากโดเนทมา แล้วลงคิวไปแล้ว แจ้งชื่อที่ลงไปในคิวมาด้วย
          <br />
          5. โดยการกดตกลงจะถือเป็นการยอมรับ{" "}
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
