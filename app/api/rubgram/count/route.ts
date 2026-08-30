import { not } from "drizzle-orm";
import { db } from "@/lib/db";
import { endgameSubmissions } from "@/lib/db/schema";
import { createCountHandler } from "@/lib/server-handlers";

export const GET = createCountHandler(() =>
  db.$count(endgameSubmissions, not(endgameSubmissions.deleted)),
);
