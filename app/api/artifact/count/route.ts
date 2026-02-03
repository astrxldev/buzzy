import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";

export async function GET() {
  return Response.json(await db.$count(submissions));
}
