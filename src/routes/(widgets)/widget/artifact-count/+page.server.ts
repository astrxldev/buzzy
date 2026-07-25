import { isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { getArtifactConfig } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [config, count] = await Promise.all([
    getArtifactConfig(),
    db.$count(submissions, isNotNull(submissions.queue)),
  ]);
  return { display: `${count} / ${config.limit < 0 ? "∞" : config.limit}` };
};
