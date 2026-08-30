"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistColumns, tierlistTiers } from "@/lib/db/schema";
import { reorderService } from "../components/reorder-service";

async function reorderTable(
  ids: string[],
  activeId: string,
  type: "tiers" | "columns",
) {
  const table = type === "tiers" ? tierlistTiers : tierlistColumns;

  return reorderService(
    activeId,
    ids,
    "Layout order is out of date. Refresh and try again.",
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
                .select({ id: table.id, order: table.order })
                .from(table)
                .orderBy(table.order, table.id),
            update: async (id, order) => {
              await tx.update(table).set({ order }).where(eq(table.id, id));
            },
          }),
        ),
      afterReorder: async () => {
        await actionLog(`Reordered tierlist ${type}`, { activeId, ids });
        revalidatePath("/admin/tl/layout");
        revalidatePath("/tl");
      },
    },
  );
}

export async function reorderTiers(args: { activeId: string; ids: string[] }) {
  return reorderTable(args.ids, args.activeId, "tiers");
}

export async function reorderColumns(args: {
  activeId: string;
  ids: string[];
}) {
  return reorderTable(args.ids, args.activeId, "columns");
}
