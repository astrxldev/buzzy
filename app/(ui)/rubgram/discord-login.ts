"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { discordAuthorizationUrl } from "./oauth";

export async function loginDiscord() {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("discord_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/rubgram",
  });

  redirect(
    discordAuthorizationUrl({
      clientId: process.env.DISCORD_CLIENT_ID!,
      redirectUri: `${process.env.BASE_URL}/rubgram/callback`,
      state,
    }),
  );
}
