// app/api/auth/discord/callback/route.ts

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { stringify } from "yaml";
import { db } from "@/lib/db"; // your drizzle db instance
import { endgameDiscord } from "@/lib/db/schema"; // your schema

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cookieStore = await cookies();
  const code = searchParams.get("code");

  if (!code) {
    if (searchParams.has("error")) redirect("/rubgram");
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Authorization: `Basic ${btoa(`${DISCORD_CLIENT_ID}:${DISCORD_CLIENT_SECRET}`)}`,
      },
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

    // Get user information
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user data");
    }

    const userData = await userResponse.json();

    // Check if user is in guild
    const guildMemberResponse = await fetch(
      `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const isInGuild = guildMemberResponse.ok;

    // If not in guild, add them using bot token
    if (!isInGuild) {
      const addMemberResponse = await fetch(
        `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${userData.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: accessToken,
          }),
        },
      );

      if (!addMemberResponse.ok) {
        console.error("Failed to add user to guild");
        // Continue anyway - they might join manually
      }
    }

    // Store/update user in database
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
        set: {
          display,
          username: userData.username,
        },
      })
      .returning({ token: endgameDiscord.token });

    // Redirect to success page or dashboard
    cookieStore.set("discord", token);
  } catch (error) {
    console.error("Discord OAuth error:", (error as Error)?.message || error);

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
  redirect("/rubgram");
}
