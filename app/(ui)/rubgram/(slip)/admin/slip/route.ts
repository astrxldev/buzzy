import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endgameArchive } from "@/lib/db/schema";

export async function GET() {
  const [{ max }] = await db
    .select({
      max: sql<number>`max(${endgameArchive.round})`,
    })
    .from(endgameArchive);
  redirect(`/rubgram/admin/slip/${max || "1"}`);
}
