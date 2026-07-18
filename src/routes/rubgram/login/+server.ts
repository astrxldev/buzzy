import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const { DISCORD_CLIENT_ID, BASE_URL } = process.env as Record<
  string,
  string | undefined
>;

export const GET: RequestHandler = () => {
  if (!DISCORD_CLIENT_ID) redirect(302, "/rubgram");
  redirect(
    302,
    `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(DISCORD_CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(new URL("/rubgram/callback", BASE_URL ?? "http://localhost:3000").href)}&scope=identify+guilds.join+guilds`,
  );
};
