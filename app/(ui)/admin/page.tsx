import { RandomWelcomeMessage } from "./client";

export default function AdminPage() {
  return (
    <div className="flex h-full w-full justify-center items-center">
      <div className="flex flex-col">
        <span className="opacity-80 text-4xl font-bold">ยินดีต้อนรับกลับ!</span>
        <span>
          <RandomWelcomeMessage />
        </span>
      </div>
    </div>
  );
}
