"use server";

import { env } from "node:process";
import Snowflake, { GatewayIntents } from "@sfjs/snowflake";
import { redis } from "@/lib/db/redis";
import { adminCheck } from "@/lib/auth";
import { forbidden } from "next/navigation";

const bot = new Snowflake({
  token: env.DISCORD_BOT_TOKEN || "",
  intents: [GatewayIntents.GUILDS, GatewayIntents.GUILD_MEMBERS],
});

type User = {
  nick: string | null;
  user: {
    global_name: string | null;
    username: string;
    id: string;
  };
};

bot.on("guildMemberAdd", async (member: User) => {
  const cached: { username: string; uid: string; display: string }[] =
    JSON.parse((await redis!.get("userlist")) ?? "[]");
  if (cached.some((m) => m.uid === member.user.id))
    cached.push({
      username: member.user.username,
      display: member.nick ?? member.user.global_name ?? member.user.username,
      uid: member.user.id,
    });
  redis!.set("userlist", JSON.stringify(cached));
});

export async function getDiscordUsers() {
  if (!(await adminCheck())) forbidden();
  const members: { username: string; uid: string; display: string }[] = [];
  let after = "0";

  const cached = await redis!.get("userlist");
  if (cached)
    return JSON.parse(cached) as {
      username: string;
      uid: string;
      display: string;
    }[];

  while (true) {
    // fetch up to 1000 members after the last user id
    const batch: User[] = await bot.guilds[env.DISCORD_GUILD_ID!].members({
      limit: 1000,
      after,
    });

    console.log(batch);
    if (!batch.length) break;

    members.push(
      ...batch.map((e) => ({
        username: e.user.username,
        display: e.nick ?? e.user.global_name ?? e.user.username,
        uid: e.user.id,
      })),
    );

    // discord pagination cursor
    after = batch[batch.length - 1].user.id;

    // stop if this was the final page
    if (batch.length < 1000) break;
  }

  redis!.set("userlist", JSON.stringify(members));

  return members;
}
