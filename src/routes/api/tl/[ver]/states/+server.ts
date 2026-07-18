import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistStates } from "@/lib/db/schema";
import { saveTierlistState } from "$lib/server/data";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const states = await db
    .select()
    .from(tierlistStates)
    .where(eq(tierlistStates.list, params.ver));
  return Response.json(states);
};

export const POST: RequestHandler = async ({ request, params }) => {
  if (!(await adminCheck(request.headers))) error(401, "Unauthorized");
  const data = await request.json();
  const result = await saveTierlistState({ ...data, list: params.ver });
  if ("error" in result) error(400, result.error);
  return Response.json(result);
};
