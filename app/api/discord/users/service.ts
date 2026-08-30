export type DiscordUser = {
  nick: string | null;
  user: { global_name: string | null; username: string; id: string };
};

export type CachedDiscordUser = {
  username: string;
  uid: string;
  display: string;
};

const normalize = (member: DiscordUser): CachedDiscordUser => ({
  username: member.user.username,
  display: member.nick ?? member.user.global_name ?? member.user.username,
  uid: member.user.id,
});

type DiscordUsersDependencies = {
  adminCheck: () => Promise<unknown>;
  forbidden: () => never;
  getCached: () => Promise<string | null>;
  setCached: (value: string) => Promise<unknown> | unknown;
  getMembers: (after: string) => Promise<DiscordUser[]>;
};

export function createDiscordUsersService(
  dependencies: DiscordUsersDependencies,
) {
  return async function getDiscordUsers() {
    if (!(await dependencies.adminCheck())) dependencies.forbidden();

    const cached = await dependencies.getCached();
    if (cached) return JSON.parse(cached) as CachedDiscordUser[];

    const members: CachedDiscordUser[] = [];
    let after = "0";
    while (true) {
      const batch = await dependencies.getMembers(after);
      if (!batch.length) break;
      members.push(...batch.map(normalize));
      after = batch.at(-1)!.user.id;
      if (batch.length < 1000) break;
    }
    await dependencies.setCached(JSON.stringify(members));
    return members;
  };
}

export function createDiscordMemberAddHandler(dependencies: {
  getCached: () => Promise<string | null>;
  setCached: (value: string) => Promise<unknown> | unknown;
}) {
  return async function onMemberAdd(member: DiscordUser) {
    const cached: CachedDiscordUser[] = JSON.parse(
      (await dependencies.getCached()) ?? "[]",
    );
    if (!cached.some((user) => user.uid === member.user.id)) {
      cached.push(normalize(member));
      await dependencies.setCached(JSON.stringify(cached));
    }
  };
}
