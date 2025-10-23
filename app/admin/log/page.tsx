import { db } from "@/lib/db";
import { auditLog, user } from "@/lib/db/schema";
import AuditLogViewer from "./client";

export default async function AuditLogViewerPage() {
  const logs = await db.select().from(auditLog).orderBy(auditLog.time);
  const users = await db
    .select({ name: user.name, email: user.email })
    .from(user);

  return <AuditLogViewer logs={logs} users={users} />;
}
