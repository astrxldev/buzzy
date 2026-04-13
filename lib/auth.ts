import { env } from "node:process";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { headers } from "next/headers";
import { uuidv7 } from "uuidv7";
import { db } from "$/db"; // your drizzle instance
import * as schema from "$/db/schema";
import { redis } from "./db/redis";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
  trustedOrigins: [
    "http://nyx:3000",
    "http://astral:3000",
    "http://localhost:3000",
    "https://dev3000.astrxl.dev",
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

  const head = await headers();

  const internalAuth = head.get("X-Internal-Auth");
  if (internalAuth && (await redis!.get(`internalToken:${internalAuth}`)))
    return {
      email: "internal@localhost",
      name: "me@dgnr.us",
    } satisfies Partial<typeof auth.$Infer.Session.user>;

  const session = await auth.api.getSession({
    headers: head,
  });

  // console.log(session);

  return session?.user.role === "admin" ? session.user : null;
}

export async function issueInternalToken() {
  const token = uuidv7();
  await redis!.setex(`internalToken:${token}`, 600, "valid");
  return token;
}
