import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { endgameSlips } from "@/lib/db/schema";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [sub] = await db
    .select({ slip: endgameSlips.slip })
    .from(endgameSlips)
    .where(eq(endgameSlips.id, id))
    .limit(1);

  if (!sub) notFound();
  if (!sub.slip) notFound();

  console.log(sub.slip.length);

  return new Response(new Uint8Array(sub.slip), {
    headers: {
      "Content-Type": "image/jpeg",
    },
  });
}
