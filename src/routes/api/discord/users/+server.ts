import { env } from "node:process";
import Snowflake, { GatewayIntents } from "@sfjs/snowflake";
import { adminCheck } from "@/lib/auth-core";
import { redis } from "@/lib/db/redis";
import type { RequestHandler } from "./$types";

type User = {
  nick: string | null;
  user: { global_name: string | null; username: string; id: string };
};

type CachedUser = { username: string; uid: string; display: string };

let bot: InstanceType<typeof Snowflake> | undefined;

function getBot() {
  if (bot) return bot;
  bot = new Snowflake({
    token: env.DISCORD_BOT_TOKEN || "",
    intents: [GatewayIntents.GUILDS, GatewayIntents.GUILD_MEMBERS],
  });
  bot.on("guildMemberAdd", async (member: User) => {
    const cached: CachedUser[] = JSON.parse(
      (await redis!.get("userlist")) ?? "[]",
    );
    if (cached.some((user) => user.uid === member.user.id)) {
      cached.push({
        username: member.user.username,
        display: member.nick ?? member.user.global_name ?? member.user.username,
        uid: member.user.id,
      });
    }
    redis!.set("userlist", JSON.stringify(cached));
  });
  return bot;
}

export const GET: RequestHandler = async ({ request }) => {
  if (!(await adminCheck(request.headers))) {
    return new Response("Forbidden", { status: 403 });
  }

  const cached = await redis!.get("userlist");
  if (cached) return Response.json(JSON.parse(cached) as CachedUser[]);

  const members: CachedUser[] = [];
  let after = "0";
  while (true) {
    const batch: User[] = await getBot().guilds[env.DISCORD_GUILD_ID!].members({
      limit: 1000,
      after,
    });
    console.log(batch);
    if (!batch.length) break;
    members.push(
      ...batch.map((member) => ({
        username: member.user.username,
        display: member.nick ?? member.user.global_name ?? member.user.username,
        uid: member.user.id,
      })),
    );
    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
  }

  redis!.set("userlist", JSON.stringify(members));
  return Response.json(members);
};
