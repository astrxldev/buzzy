"use server";

import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistBadges } from "@/lib/db/schema";
import { midpointOrder, normalizedOrders } from "../components/order";

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;

  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((id, index) => id === b[index]);
}

export async function reorderBadges(args: {
  typeId: string;
  activeId: string;
  ids: string[];
}) {
  if (!(await adminCheck())) redirect("/login");

  const { typeId, activeId, ids } = args;

  await db.transaction(async (tx) => {
    const badges = await tx
      .select()
      .from(tierlistBadges)
      .where(or(isNull(tierlistBadges.type), eq(tierlistBadges.type, typeId)))
      .orderBy(tierlistBadges.order, tierlistBadges.id);

    const visibleIds = badges.map((badge) => badge.id);
    if (!sameIds(visibleIds, ids)) {
      throw new Error("Badge order is out of date. Refresh and try again.");
    }

    const index = ids.indexOf(activeId);
    if (index === -1) throw new Error("Moved badge is missing.");

    const prev =
      index > 0
        ? badges.find((badge) => badge.id === ids[index - 1])
        : undefined;
    const next =
      index < ids.length - 1
        ? badges.find((badge) => badge.id === ids[index + 1])
        : undefined;
    const nextOrder = midpointOrder(prev?.order, next?.order);

    if (nextOrder == null) {
      for (const item of normalizedOrders(ids)) {
        await tx
          .update(tierlistBadges)
          .set({ order: item.order })
          .where(eq(tierlistBadges.id, item.id));
      }
    } else {
      await tx
        .update(tierlistBadges)
        .set({ order: nextOrder })
        .where(
          and(
            eq(tierlistBadges.id, activeId),
            or(isNull(tierlistBadges.type), eq(tierlistBadges.type, typeId)),
          ),
        );
    }
  });

  await actionLog(`Reordered tierlist badges for ${typeId}`, {
    typeId,
    activeId,
    ids,
  });

  revalidatePath(`/admin/tl/${typeId}`);
  revalidatePath(`/tl/${typeId}`);
}
