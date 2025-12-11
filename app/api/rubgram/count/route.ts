import { db } from "@/lib/db";
import { endgameSubmissions } from "@/lib/db/schema";

export async function GET() {
  return Response.json(await db.$count(endgameSubmissions));
}
