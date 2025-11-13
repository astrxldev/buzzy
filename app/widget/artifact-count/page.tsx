import { Watcher } from "@/app/(ui)/artifact/admin/client";
import { getArtifactConfig } from "@/lib/api";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";

export default async function ArtifactCountWidget() {
  const config = await getArtifactConfig();
  const count = await db.$count(submissions);

  return (
    <span className="p-1">
      {count} / {config.limit < 0 ? "∞" : config.limit}
      <Watcher />
    </span>
  );
}
