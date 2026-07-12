import { desc, getTableColumns, sql, sum } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { DonateAdminPage } from "./client";

export default async function () {
  if (!(await adminCheck()))
    redirect(`/login?next=${encodeURIComponent("/donate/admin")}`);

  const [data, [stats]] = await Promise.all([
    db
      .select({
        ...getTableColumns(donations),
        image: sql<Buffer>`${donations.image} IS NOT NULL`,
      })
      .from(donations)
      .limit(100)
      .orderBy(desc(donations.id)),
    db
      .select({
        total: sum(donations.amount).mapWith(Number),
        today: sql<number>`
          COALESCE(
            SUM(${donations.amount}) FILTER (
              WHERE ${donations.created} >= NOW() - INTERVAL '24 hours'
            ),
            0
          )
        `,
      })
      .from(donations)
      .limit(1),
  ]);
  return <DonateAdminPage data={data} stats={stats} />;
}

export const metadata: Metadata = {
  title: "โดเนททั้งหมด",
  description: "ดูโดเนททั้งหมด",
};

export const dynamic = "force-dynamic";
