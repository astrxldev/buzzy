import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cdn } from "@/lib/db/schema";
import { createCdnHandler } from "@/lib/server-handlers";

export const dynamic = "force-dynamic";

export const GET = createCdnHandler(async (id) => {
  const [file] = await db.select().from(cdn).where(eq(cdn.id, id)).limit(1);
  return file ? { ...file, data: new Uint8Array(file.data) } : null;
}, notFound);
