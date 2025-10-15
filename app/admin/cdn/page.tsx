import { DataTable } from "@/components/tantable";
import { db } from "@/lib/db";
import { cdn } from "@/lib/db/schema";
import { cdnColumns } from "./table";

export default async function CdnManagerPage() {
  const files = await db
    .select({ id: cdn.id, name: cdn.name, size: cdn.size })
    .from(cdn)
    .orderBy(cdn.name);
  return <DataTable columns={cdnColumns} data={files} />;
}
