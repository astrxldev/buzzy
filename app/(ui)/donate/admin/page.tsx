import { db } from "@/lib/db";
import { DonateAdminPage } from "./client";
import { donations } from "@/lib/db/schema";
import { desc, getTableColumns, sql } from "drizzle-orm";
import { adminCheck } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function () {
  if (!(await adminCheck()))
    redirect(`/login?next=${encodeURIComponent("/donate/admin")}`);

  const data = await db
    .select({
      ...getTableColumns(donations),
      image: sql<Buffer>`${donations.image} IS NOT NULL`,
    })
    .from(donations)
    .limit(100)
    .orderBy(desc(donations.id));
  return <DonateAdminPage data={data} />;
}

export const dynamic = "force-dynamic";
