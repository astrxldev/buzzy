"use server";

import { env } from "node:process";
import Snowflake, { GatewayIntents } from "@sfjs/snowflake";
import { forbidden } from "next/navigation";
import { adminCheck } from "@/lib/auth";
import { redis } from "@/lib/db/redis";
import {
  createDiscordMemberAddHandler,
  createDiscordUsersService,
  type DiscordUser,
} from "./service";

const bot = new Snowflake({
  token: env.DISCORD_BOT_TOKEN || "",
  intents: [GatewayIntents.GUILDS, GatewayIntents.GUILD_MEMBERS],
});

const cache = {
  getCached: () => redis!.get("userlist"),
  setCached: (value: string) => redis!.set("userlist", value),
};

bot.on("guildMemberAdd", createDiscordMemberAddHandler(cache));

export const getDiscordUsers = createDiscordUsersService({
  adminCheck,
  forbidden,
  ...cache,
  getMembers: (after) =>
    bot.guilds[env.DISCORD_GUILD_ID!].members({
      limit: 1000,
      after,
    }) as Promise<DiscordUser[]>,
});
