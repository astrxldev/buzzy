import { redirect } from "@sveltejs/kit";
import { stringify } from "yaml";
import { db } from "@/lib/db";
import { endgameDiscord } from "@/lib/db/schema";
import type { RequestHandler } from "./$types";

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get("code");
  if (!code) {
    if (url.searchParams.has("error")) redirect(302, "/rubgram");
    return Response.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(
        `Failed to exchange code for token: ${tokenResponse.status}\n${stringify(await tokenResponse.json())}`,
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) throw new Error("Failed to fetch user data");
    const userData = await userResponse.json();

    const guildMemberResponse = await fetch(
      `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!guildMemberResponse.ok) {
      const addMemberResponse = await fetch(
        `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${userData.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ access_token: accessToken }),
        },
      );
      if (!addMemberResponse.ok) console.error("Failed to add user to guild");
    }

    const display = userData.global_name || userData.username;
    const [{ token }] = await db
      .insert(endgameDiscord)
      .values({
        uid: userData.id,
        display,
        username: userData.username,
      })
      .onConflictDoUpdate({
        target: endgameDiscord.uid,
        set: { display, username: userData.username },
      })
      .returning();

    cookies.set("discord", token, {
      httpOnly: false,
      path: "/rubgram",
      sameSite: "lax",
      secure: false,
    });
  } catch (error) {
    console.error("Discord OAuth error:", (error as Error)?.message || error);
    return Response.json({ error: "Authentication failed" }, { status: 500 });
  }

  redirect(302, "/rubgram");
};
