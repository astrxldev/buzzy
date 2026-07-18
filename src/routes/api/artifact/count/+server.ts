import type { RequestHandler } from "./$types";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";

export const GET: RequestHandler = async () => {
  return Response.json(await db.$count(submissions));
};
