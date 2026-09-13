import { endOfMonth, startOfMonth } from "date-fns";
import { between, desc, getTableColumns, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { DonateAdminPage } from "./client";

export default async function () {
  if (!(await adminCheck()))
    redirect(`/login?next=${encodeURIComponent("/donate/admin")}`);

  const now = new Date();
  const donation = alias(donations, "donation");
  const [data, [stats]] = await Promise.all([
    db
      .select({
        ...getTableColumns(donation),
        image: sql<Buffer>`${donation.image} IS NOT NULL`,
        checked: sql<boolean | null>`
          (SELECT "artifact"."submissions"."checked"
           FROM "artifact"."submissions"
           WHERE "artifact"."submissions"."uid" = "donation"."uid")
        `,
        artifactSubmissionId: sql<string | null>`
          (SELECT "artifact"."submissions"."id"
           FROM "artifact"."submissions"
           WHERE "artifact"."submissions"."uid" = "donation"."uid")
        `,
      })
      .from(donation)
      .limit(100)
      .orderBy(desc(donation.id)),
    db
      .select({
        total: sum(donations.amount).mapWith(Number),
        today: sql<number>`
          COALESCE(
            SUM(${donations.amount}) FILTER (
              WHERE ${donations.created} >= date_trunc('day', NOW())
            ),
            0
          )
        `,
      })
      .from(donations)
      .where(between(donations.created, startOfMonth(now), endOfMonth(now)))
      .limit(1),
  ]);
  return <DonateAdminPage data={data} stats={stats} />;
}

export const metadata: Metadata = {
  title: "โดเนททั้งหมด",
  description: "ดูโดเนททั้งหมด",
};

export const dynamic = "force-dynamic";
