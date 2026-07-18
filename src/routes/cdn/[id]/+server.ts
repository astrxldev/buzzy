import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "@/lib/db";
import { cdn } from "@/lib/db/schema";

export const GET: RequestHandler = async ({ params }) => {
  const [file] = await db
    .select()
    .from(cdn)
    .where(eq(cdn.id, params.id))
    .limit(1);
  if (!file) error(404, "Not found");

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "Content-Length": file.size,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
