import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { actionLog, cdnify } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { guides } from "@/lib/db/schema";
import { createGuideHandler } from "./handler";

export const POST = createGuideHandler({
  adminCheck,
  fetch,
  actionLog,
  revalidatePath,
  async saveGuide({ name, link }, buf) {
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
  },
});
