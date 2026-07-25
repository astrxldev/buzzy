import { query } from "$app/server";
import { isNotNull, not } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { endgameSubmissions, submissions } from "@/lib/db/schema";
import { getArtifactConfig } from "$lib/server/data";

export const getWidgetCount = query(
  z.enum(["artifact", "rubgram"]),
  async (topic) => {
    const [config, count] = await Promise.all([
      getArtifactConfig(),
      topic === "artifact"
        ? db.$count(submissions, isNotNull(submissions.queue))
        : db.$count(endgameSubmissions, not(endgameSubmissions.deleted)),
    ]);
    return `${count} / ${config.limit < 0 ? "∞" : config.limit}`;
  },
);
