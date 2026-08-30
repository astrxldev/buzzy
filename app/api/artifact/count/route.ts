import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { createCountHandler } from "@/lib/server-handlers";

export const GET = createCountHandler(() => db.$count(submissions));
