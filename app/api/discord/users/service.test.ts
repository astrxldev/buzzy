import { describe, expect, mock, test } from "bun:test";
import {
  createDiscordMemberAddHandler,
  createDiscordUsersService,
  type DiscordUser,
} from "./service";

const member = (id: string, nick: string | null = null): DiscordUser => ({
  nick,
  user: { id, username: `user-${id}`, global_name: `global-${id}` },
});

function dependencies() {
  return {
    adminCheck: mock(async () => true),
    forbidden: mock((): never => {
      throw new Error("forbidden");
    }),
    getCached: mock(async (): Promise<string | null> => null),
    setCached: mock(async (_value: string) => {}),
    getMembers: mock(async (_after: string): Promise<DiscordUser[]> => []),
  };
}

describe("Discord users service", () => {
  test("forbids non-admin callers before reading cache", async () => {
    const deps = dependencies();
    deps.adminCheck.mockResolvedValue(false);
    expect(createDiscordUsersService(deps)()).rejects.toThrow("forbidden");
    expect(deps.getCached).not.toHaveBeenCalled();
  });

  test("returns cached users without calling Discord", async () => {
    const deps = dependencies();
    deps.getCached.mockResolvedValue(
      '[{"uid":"1","username":"user","display":"User"}]',
    );
    expect(await createDiscordUsersService(deps)()).toEqual([
      { uid: "1", username: "user", display: "User" },
    ]);
    expect(deps.getMembers).not.toHaveBeenCalled();
  });

  test("paginates, normalizes, and caches guild members", async () => {
    const deps = dependencies();
    const first = Array.from({ length: 1000 }, (_, index) =>
      member(String(index + 1)),
    );
    deps.getMembers
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce([member("1001", "Nick")]);
    const users = await createDiscordUsersService(deps)();
    expect(deps.getMembers).toHaveBeenNthCalledWith(1, "0");
    expect(deps.getMembers).toHaveBeenNthCalledWith(2, "1000");
    expect(users).toHaveLength(1001);
    expect(users.at(-1)).toEqual({
      uid: "1001",
      username: "user-1001",
      display: "Nick",
    });
    expect(JSON.parse(deps.setCached.mock.calls[0]![0])).toEqual(users);
  });
});

describe("Discord member-add cache", () => {
  test("adds a member not already present", async () => {
    const deps = dependencies();
    deps.getCached.mockResolvedValue(
      '[{"uid":"1","username":"old","display":"Old"}]',
    );
    await createDiscordMemberAddHandler(deps)(member("2"));
    expect(JSON.parse(deps.setCached.mock.calls[0]![0])).toEqual([
      { uid: "1", username: "old", display: "Old" },
      { uid: "2", username: "user-2", display: "global-2" },
    ]);
  });

  test("does not duplicate an existing member", async () => {
    const deps = dependencies();
    deps.getCached.mockResolvedValue('[{"uid":"2"}]');
    await createDiscordMemberAddHandler(deps)(member("2"));
    expect(deps.setCached).not.toHaveBeenCalled();
  });
});
