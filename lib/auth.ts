import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "$/db"; // your drizzle instance
import * as schema from "$/db/schema";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema,
  }),
});

export async function apiAuthCheck() {
  "use server";

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session.user;
}