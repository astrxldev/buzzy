import * as schema from "./schema";

async function createDb() {
  if (typeof Bun !== "undefined") {
    const { drizzle } = await import("drizzle-orm/bun-sql");
    return drizzle(process.env.DATABASE_URL!, { schema });
  }

  const { drizzle } = await import("drizzle-orm/node-postgres");
  return drizzle.mock({ schema });
}

export const db = await createDb();
