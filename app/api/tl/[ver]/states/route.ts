import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tierlistStates } from "@/lib/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ver: string }> },
) {
  const { ver } = await params;
  const states = await db
    .select()
    .from(tierlistStates)
    .where(eq(tierlistStates.list, ver));
  return NextResponse.json(states);
}
