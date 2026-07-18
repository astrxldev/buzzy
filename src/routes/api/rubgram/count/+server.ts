import { not } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "@/lib/db";
import { endgameSubmissions } from "@/lib/db/schema";

export const GET: RequestHandler = async () => {
  return Response.json(
    await db.$count(endgameSubmissions, not(endgameSubmissions.deleted)),
  );
};
