import { env } from "node:process";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { headers } from "next/headers";
import { db } from "$/db"; // your drizzle instance
import * as schema from "$/db/schema";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
  trustedOrigins: [
    "http://nyx:3000",
    "http://astral:3000",
    "http://localhost:3000",
    "https://dev3000.dgnr.us",
    "http://m.dgnr.us",
  ],
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema,
  }),
});

export async function adminCheck() {
  "use server";

  if (env.NO_AUTH_CHECK) return null;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // console.log(session);

  return session?.user.role === "admin" ? session.user : null;
}
