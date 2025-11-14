import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: ["./lib/db/schema.ts", "./lib/db/references.ts"],
  schemaFilter: ["public", "artifact", "tierlist", "endgame"],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
