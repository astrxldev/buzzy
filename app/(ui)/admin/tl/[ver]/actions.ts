"use server";

import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistBadges } from "@/lib/db/schema";
import { reorderService } from "../components/reorder-service";

export async function reorderBadges(args: {
  typeId: string;
  activeId: string;
  ids: string[];
}) {
  const { typeId, activeId, ids } = args;
  return reorderService(
    activeId,
    ids,
    "Badge order is out of date. Refresh and try again.",
    {
      adminCheck: async () => {
        if (!(await adminCheck())) redirect("/login");
        return true;
      },
      transaction: (callback) =>
        db.transaction((tx) =>
          callback({
            list: () =>
              tx
                .select({ id: tierlistBadges.id, order: tierlistBadges.order })
                .from(tierlistBadges)
                .where(
                  or(
                    isNull(tierlistBadges.type),
                    eq(tierlistBadges.type, typeId),
                  ),
                )
                .orderBy(tierlistBadges.order, tierlistBadges.id),
            update: async (id, order) => {
              await tx
                .update(tierlistBadges)
                .set({ order })
                .where(
                  and(
                    eq(tierlistBadges.id, id),
                    or(
                      isNull(tierlistBadges.type),
                      eq(tierlistBadges.type, typeId),
                    ),
                  ),
                );
            },
          }),
        ),
      afterReorder: async () => {
        await actionLog(`Reordered tierlist badges for ${typeId}`, {
          typeId,
          activeId,
          ids,
        });
        revalidatePath(`/admin/tl/${typeId}`);
        revalidatePath(`/tl/${typeId}`);
      },
    },
  );
}
