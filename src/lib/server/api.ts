import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
export { getAmberVh } from "@/lib/amber";

export async function writeAuditLog(
  text: string,
  details?: unknown,
  author?: string,
) {
  console.log(` LOG ${author || ""} ${text}`);

  const [entry] = await db
    .insert(auditLog)
    .values({ author, text, details })
    .returning()
    .catch(() => {
      console.error(
        `Error logging audit log, printing it here:\n${author || "[Unknown User]"} - ${text}`,
      );
      return [];
    });

  if (entry) sse.log.pub("update", entry);
}
