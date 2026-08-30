import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endgameDiscord } from "@/lib/db/schema";
import { createRubgramCallbackHandler } from "./handler";

const config = {
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  redirectUri: process.env.DISCORD_REDIRECT_URI!,
  guildId: process.env.DISCORD_GUILD_ID!,
  botToken: process.env.DISCORD_BOT_TOKEN!,
};

export async function GET(request: Request) {
  const cookieStore = await cookies();
  return createRubgramCallbackHandler({
    config,
    fetch,
    getState: () => cookieStore.get("discord_oauth_state")?.value,
    clearState: () => cookieStore.delete("discord_oauth_state"),
    setSession: (token) => cookieStore.set("discord", token),
    redirect,
    logError: (message, error) => console.error(message, error),
    saveUser: async ({ uid, display, username }) => {
      const [{ token }] = await db
        .insert(endgameDiscord)
        .values({ uid, display, username })
        .onConflictDoUpdate({
          target: endgameDiscord.uid,
          set: { display, username },
        })
        .returning({ token: endgameDiscord.token });
      return token;
    },
  })(request);
}
