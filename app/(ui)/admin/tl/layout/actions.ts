"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistColumns, tierlistTiers } from "@/lib/db/schema";
import { midpointOrder, normalizedOrders } from "../components/order";

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;

  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((id, index) => id === b[index]);
}

async function reorderTable(
  ids: string[],
  activeId: string,
  type: "tiers" | "columns",
) {
  const table = type === "tiers" ? tierlistTiers : tierlistColumns;

  await db.transaction(async (tx) => {
    const items = await tx.select().from(table).orderBy(table.order, table.id);
    const visibleIds = items.map((item) => item.id);
    if (!sameIds(visibleIds, ids)) {
      throw new Error("Layout order is out of date. Refresh and try again.");
    }

    const index = ids.indexOf(activeId);
    if (index === -1) throw new Error("Moved item is missing.");

    const prev =
      index > 0 ? items.find((item) => item.id === ids[index - 1]) : undefined;
    const next =
      index < ids.length - 1
        ? items.find((item) => item.id === ids[index + 1])
        : undefined;
    const nextOrder = midpointOrder(prev?.order, next?.order);

    if (nextOrder == null) {
      for (const item of normalizedOrders(ids)) {
        await tx
          .update(table)
          .set({ order: item.order })
          .where(eq(table.id, item.id));
      }
    } else {
      await tx
        .update(table)
        .set({ order: nextOrder })
        .where(eq(table.id, activeId));
    }
  });

  await actionLog(`Reordered tierlist ${type}`, { activeId, ids });
  revalidatePath("/admin/tl/layout");
  revalidatePath("/tl");
}

export async function reorderTiers(args: { activeId: string; ids: string[] }) {
  if (!(await adminCheck())) redirect("/login");
  return reorderTable(args.ids, args.activeId, "tiers");
}

export async function reorderColumns(args: {
  activeId: string;
  ids: string[];
}) {
  if (!(await adminCheck())) redirect("/login");
  return reorderTable(args.ids, args.activeId, "columns");
}
