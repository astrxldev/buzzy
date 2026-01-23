import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { CharManager } from "./client";

export default async function CharManagerPage() {
  const chars = await db
    .select()
    .from(characters)
    .orderBy(desc(characters.amber), desc(characters.amber), characters.id);
  return <CharManager chars={chars} />;
}
