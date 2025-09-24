import { Loader } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <Loader className="mx-auto size-8 animate-spin" />
        <p className="text-center text-sm">กําลังโหลดข้อมูล</p>
      </div>
    </div>
  );
}
