import { db } from "@/lib/db";
import { cdn } from "@/lib/db/schema";
import { CdnTable } from "./table";

export default async function CdnManagerPage() {
  const files = await db
    .select({ id: cdn.id, name: cdn.name, size: cdn.size })
    .from(cdn)
    .orderBy(cdn.name);

  return (
    <div className="m-2 ml-0">
      <CdnTable files={files} />
    </div>
  );
}
