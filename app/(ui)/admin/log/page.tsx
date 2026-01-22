import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, user } from "@/lib/db/schema";
import AuditLogViewer from "./client";

export default async function AuditLogViewerPage() {
  const { rows: logs } = (await db.execute(sql`
    SELECT *
    FROM (
      SELECT *
      FROM ${auditLog}
      ORDER BY ${auditLog.id} DESC
      LIMIT 1000
    ) t
    ORDER BY id ASC;
  `)) as { rows: (typeof auditLog.$inferSelect)[] };
  const users = await db
    .select({ name: user.name, email: user.email })
    .from(user);

  return <AuditLogViewer logs={logs} users={users} />;
}
