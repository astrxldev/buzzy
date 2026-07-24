import { endOfMonth, startOfMonth } from "date-fns";
import { between, getTableColumns, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ModalBase } from "@/components/modal";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { CalendarClient } from "./client";

export default async function DonateCalendarModal({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  if (!(await adminCheck())) {
    redirect(`/login?next=${encodeURIComponent("/donate/admin/calendar")}`);
  }

  const { month } = await searchParams;
  const date = month ? new Date(`${month}-01T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) redirect("/donate/admin");

  const from = startOfMonth(date);
  const to = endOfMonth(date);

  const rows = await db
    .select({
      ...getTableColumns(donations),
      image: sql<boolean>`${donations.image} IS NOT NULL`,
    })
    .from(donations)
    .where(between(donations.created, from, to))
    .orderBy(donations.created);

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <ModalBase title="ปฏิทินโดเนท" full wrap>
      <CalendarClient
        year={date.getFullYear()}
        month={date.getMonth()}
        rows={rows}
        total={total}
      />
    </ModalBase>
  );
}

export const dynamic = "force-dynamic";
