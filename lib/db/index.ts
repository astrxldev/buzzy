import { drizzle } from "drizzle-orm/bun-sql";
import { withReplicas } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export const primaryDb = drizzle(process.env.DATABASE_URL!, { schema });

export const db = process.env.REPLICA_DATABASE_URL
  ? withReplicas(primaryDb, [
      drizzle(process.env.REPLICA_DATABASE_URL!, { schema }),
      drizzle(process.env.REPLICA_DATABASE_URL!, { schema }),
    ])
  : primaryDb;
