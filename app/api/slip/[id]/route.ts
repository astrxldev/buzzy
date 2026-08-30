import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { endgameSlips } from "@/lib/db/schema";
import { createSlipHandler } from "@/lib/server-handlers";

export const GET = createSlipHandler(async (id) => {
  const [sub] = await db
    .select({ slip: endgameSlips.slip })
    .from(endgameSlips)
    .where(eq(endgameSlips.id, id))
    .limit(1);
  return sub?.slip ? new Uint8Array(sub.slip) : null;
}, notFound);
