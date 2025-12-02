import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cdn } from "@/lib/db/schema";

export const revalidate = 86400; // 24 hours

export async function generateStaticParams() {
  return await db.select({ id: cdn.id }).from(cdn);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [file] = await db.select().from(cdn).where(eq(cdn.id, id)).limit(1);
  if (!file) return notFound();
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "Content-Length": file.size,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
