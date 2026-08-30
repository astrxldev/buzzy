import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";
import { withReplicas } from "drizzle-orm/pg-core";

export const db = process.env.REPLICA_DATABASE_URL
  ? withReplicas(drizzle(process.env.DATABASE_URL!, { schema }), [
      drizzle(process.env.REPLICA_DATABASE_URL!, { schema }),
      drizzle(process.env.REPLICA_DATABASE_URL!, { schema }),
    ])
  : drizzle(process.env.DATABASE_URL!, { schema });
