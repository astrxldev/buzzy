import { env } from "node:process";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { headers } from "next/headers";
import { uuidv7 } from "uuidv7";
import { db } from "$/db"; // your drizzle instance
import * as schema from "$/db/schema";
import { checkAdmin } from "./auth-check";
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
    "http://buzz.sudloh.com",
    "http://app.buzz.svc.cluster.local:3000",
  ],
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema,
  }),
});

export async function adminCheck() {
  "use server";

  let requestHeaders: Awaited<ReturnType<typeof headers>> | undefined;
  const getHeaders = async () => (requestHeaders ??= await headers());

  return checkAdmin({
    noAuthCheck: env.NO_AUTH_CHECK,
    bypassUser: {
      email: "bypass@localhost",
      name: "me@dgnr.us",
    },
    internalUser: {
      email: "internal@localhost",
      name: "me@dgnr.us",
    },
    getInternalAuth: async () => (await getHeaders()).get("X-Internal-Auth"),
    getInternalToken: (token) => redis!.get(`internalToken:${token}`),
    getSession: async () =>
      auth.api.getSession({ headers: await getHeaders() }),
  });
}

export async function issueInternalToken() {
  const token = uuidv7();
  await redis!.setex(`internalToken:${token}`, 600, "valid");
  return token;
}
