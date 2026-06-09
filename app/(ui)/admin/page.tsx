import { RandomWelcomeMessage } from "./client";

export default function AdminPage() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center">
        {/* oxlint-disable-next-line tailwindcss/no-unknown-classes */}
        <span className="no-translate text-4xl font-bold">ยินดีต้อนรับกลับ!</span>
        <div className="mt-1">
          <RandomWelcomeMessage />
        </div>
      </div>
    </div>
  );
}
