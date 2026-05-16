import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import z from "zod";
import { actionLog, cdnify } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { guides } from "@/lib/db/schema";

const Schema = z.object({
  name: z.string().max(1000),
  link: z.httpUrl(),
  imageUrl: z.httpUrl(),
});

export async function POST(req: Request) {
  if (!(await adminCheck()))
    return new Response("Unauthorized", { status: 401 });

  const json = await req.json().catch(() => null);
  const result = Schema.safeParse(json);
  if (!result.success)
    return new Response(z.prettifyError(result.error), { status: 422 });
  const { name, link, imageUrl } = result.data;

  const buf = await fetch(imageUrl).then((r) => r.blob());
  await db.transaction(async (tx) => {
    const image = await cdnify(buf, {
      name: `autoguide-${name.replace(/[^a-z]/gi, "").toLowerCase()}`,
      tx,
    });
    const [{ maxOrder }] = await tx
      .select({
        maxOrder: sql<number>`
          MAX(${guides.order})`,
      })
      .from(guides);
    await tx.insert(guides).values({
      order: (maxOrder ?? 0) + 10,
      name,
      image,
      link,
    });
  });

  await actionLog(`API Added guide ${name}`, { link, imageUrl });
  revalidatePath("/guide");
  revalidatePath("/admin/guide");
}
