import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tierlistStates } from "@/lib/db/schema";
import { createStatesHandler } from "@/lib/server-handlers";

export const GET = createStatesHandler((version) =>
  db.select().from(tierlistStates).where(eq(tierlistStates.list, version)),
);
