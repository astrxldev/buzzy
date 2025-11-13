import { Blocker } from "@/components/blocker";
import { EndgameForm } from "./form";

export default async function EndgamePage() {
  return (
    <div className="flex h-full w-full justify-center items-center">
      <div className="rounded flex flex-col bg-card border p-2">
        <Blocker>ขณะนี้คิวเต็มแล้ว</Blocker>
        <h1>รับลงเอนเกคอนเท้น</h1>
        <EndgameForm />
      </div>
    </div>
  );
}
