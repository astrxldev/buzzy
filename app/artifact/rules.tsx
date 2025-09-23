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
          1. คิวจะใช้ระบบเรียง หรืออาจสุ่มบางครั้ง แต่ถ้ามีโดเนทลัดคิวมาจะดูไอดีที่โดเนทมาก่อน
          <br />
          2. คิวจะมีการลบใหม่หมดทุกครั้งหลังจบสตรีม (ต้องลงใหม่ทุกครั้งนะคับถ้าไม่ได้คิวในครั้งที่แล้ว
          ครั้งหน้าก็ลงใหม่ได้ตามปกติ)
          <br /> 3. สำหรับการลงคิวในนี้ จะดูให้แค่
          <u className="text-red-500">ตัวละครเดียว</u>เท่านั้น แต่หากเป็นโดเนทลัดคิว
          สามารถดูได้สูงสุด 8 ตัว
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
