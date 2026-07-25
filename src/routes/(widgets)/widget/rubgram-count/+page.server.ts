import { not } from "drizzle-orm";
import { db } from "@/lib/db";
import { endgameSubmissions } from "@/lib/db/schema";
import { getArtifactConfig } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [config, count] = await Promise.all([
    getArtifactConfig(),
    db.$count(endgameSubmissions, not(endgameSubmissions.deleted)),
  ]);
  return { display: `${count} / ${config.limit < 0 ? "∞" : config.limit}` };
};
