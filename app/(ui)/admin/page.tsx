import { RandomWelcomeMessage } from "./client";

export default function AdminPage() {
  return (
    <div className="flex h-full w-full justify-center items-center">
      <div className="flex flex-col items-center">
        <span className="text-4xl font-bold no-translate">ยินดีต้อนรับกลับ!</span>
        <div className="mt-1">
          <RandomWelcomeMessage />
        </div>
      </div>
    </div>
  );
}
