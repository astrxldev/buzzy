import { endOfMonth, startOfMonth } from "date-fns";
import { and, between, eq, getTableColumns } from "drizzle-orm";
import { redirect } from "next/navigation";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  endgameDiscord,
  endgameSettings,
  endgameSlips,
  endgameSubmissions,
} from "@/lib/db/schema";
import { CalendarClient } from "./client";

export const metadata = { title: "ปฏิทินคิว" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  if (!(await adminCheck()))
    redirect(`/login?next=${encodeURIComponent("/rubgram/admin/calendar")}`);

  const { month } = await searchParams;
  const date = month ? new Date(month + "-01T00:00:00") : new Date();
  if (isNaN(date.getTime())) redirect("/rubgram/admin/calendar");

  const from = startOfMonth(date);
  const to = endOfMonth(date);

  const { slip: _, ...slipColumns } = getTableColumns(endgameSlips);
  const [rows, [settings]] = await Promise.all([
    db
      .select({
        ...getTableColumns(endgameSubmissions),
        user: getTableColumns(endgameDiscord),
        slip: slipColumns,
      })
      .from(endgameSubmissions)
      .where(and(between(endgameSubmissions.submit_day, from, to)))
      .leftJoin(endgameDiscord, eq(endgameDiscord.uid, endgameSubmissions.user))
      .leftJoin(endgameSlips, eq(endgameSlips.id, endgameSubmissions.slip))
      .orderBy(endgameSubmissions.submit_day, endgameSubmissions.queue),
    db
      .select({ monthly: endgameSettings.monthly })
      .from(endgameSettings)
      .limit(1),
  ]);

  const total = rows.reduce((s, r) => s + r.price, 0);
  const monthly = settings?.monthly ?? {};

  return (
    <CalendarClient
      year={date.getFullYear()}
      month={date.getMonth()}
      rows={rows}
      total={total}
      monthly={monthly}
    />
  );
}
