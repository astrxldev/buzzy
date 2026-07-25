import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { uuidv7 } from "uuidv7";
import { db } from "$/db";
import * as schema from "$/db/schema";
import { redis } from "./db/redis";

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "buzz-local-development-secret",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
  trustedOrigins: [
    "http://nyx:3000",
    "http://nyx:5173",
    "http://astral:3000",
    "http://astral:5173",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://dev3000.astrxl.dev",
    "http://m.dgnr.us",
    "http://buzz.sudloh.com",
    "http://app.buzz.svc.cluster.local:3000",
    "https://dev5173.astrxl.dev",
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
});

export async function adminCheck(headers: Headers) {
  if (process.env.NO_AUTH_CHECK)
    return {
      email: "bypass@localhost",
      name: "me@dgnr.us",
    } satisfies Partial<typeof auth.$Infer.Session.user>;

  const internalAuth = headers.get("X-Internal-Auth");
  if (internalAuth && (await redis!.get(`internalToken:${internalAuth}`)))
    return {
      email: "internal@localhost",
      name: "me@dgnr.us",
    } satisfies Partial<typeof auth.$Infer.Session.user>;

  const session = await auth.api.getSession({ headers });
  return session?.user.role === "admin" ? session.user : null;
}

export async function issueInternalToken() {
  const token = uuidv7();
  await redis!.setex(`internalToken:${token}`, 600, "valid");
  return token;
}
