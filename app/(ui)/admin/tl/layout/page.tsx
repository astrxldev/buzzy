import { redirect } from "next/navigation";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistColumns, tierlistTiers } from "@/lib/db/schema";
import { LayoutEditor } from "./client";

export default async function TierlistLayoutPage() {
  if (!(await adminCheck())) redirect("/login");

  const [tiers, columns] = await Promise.all([
    db
      .select()
      .from(tierlistTiers)
      .orderBy(tierlistTiers.order, tierlistTiers.id),
    db
      .select()
      .from(tierlistColumns)
      .orderBy(tierlistColumns.order, tierlistColumns.id),
  ]);

  return <LayoutEditor tiers={tiers} columns={columns} />;
}

export const dynamic = "force-dynamic";
