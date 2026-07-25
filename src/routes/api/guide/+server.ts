import { sql } from "drizzle-orm";
import z from "zod";
import { adminCheck } from "@/lib/auth-core";
import { db } from "@/lib/db";
import { cdn, guides } from "@/lib/db/schema";
import { b2s } from "@/lib/utils";
import { writeAuditLog } from "$lib/server/api";
import type { RequestHandler } from "./$types";

const schema = z.object({
  name: z.string().max(1000),
  link: z.httpUrl(),
  imageUrl: z.httpUrl(),
});

export const POST: RequestHandler = async ({ request }) => {
  const user = await adminCheck(request.headers);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const input = await request.json().catch(() => null);
  const result = schema.safeParse(input);
  if (!result.success) {
    return new Response(z.prettifyError(result.error), { status: 422 });
  }
  const { name, link, imageUrl } = result.data;
  const imageData = await fetch(imageUrl).then((response) => response.blob());
  const imageName = `autoguide-${name.replace(/[^a-z]/gi, "").toLowerCase()}`;

  await db.transaction(async (tx) => {
    const [{ id: image }] = await tx
      .insert(cdn)
      .values({
        name: imageName,
        data: Buffer.from(await imageData.arrayBuffer()),
        size: `${imageData.size}`,
        type: imageData.type,
      })
      .returning();
    const [{ maxOrder }] = await tx
      .select({ maxOrder: sql<number>`MAX(${guides.order})` })
      .from(guides);
    await tx.insert(guides).values({
      order: (maxOrder ?? 0) + 10,
      name,
      image,
      link,
    });
  });

  await writeAuditLog(
    `File uploaded: ${imageName} (${b2s(imageData.size)})`,
    undefined,
    user.name,
  );
  await writeAuditLog(`API Added guide ${name}`, { link, imageUrl }, user.name);
  return new Response("OK");
};
