import { describe, expect, mock, test } from "bun:test";
import { checkAdmin } from "./auth-check";

type User = {
  email: string;
  name: string;
  role?: string;
};

const bypassUser: User = { email: "bypass@localhost", name: "Bypass" };
const internalUser: User = { email: "internal@localhost", name: "Internal" };

function dependencies(
  overrides: Partial<Parameters<typeof checkAdmin<User>>[0]> = {},
) {
  return {
    noAuthCheck: undefined,
    bypassUser,
    internalUser,
    getInternalAuth: mock(async () => null),
    getInternalToken: mock(async () => null),
    getSession: mock(async () => null),
    ...overrides,
  };
}

describe("checkAdmin", () => {
  test("only enables NO_AUTH_CHECK for the exact string true", async () => {
    for (const value of [undefined, "", "1", "TRUE", "false"]) {
      const deps = dependencies({ noAuthCheck: value });
      expect(await checkAdmin(deps)).toBeNull();
      expect(deps.getSession).toHaveBeenCalledTimes(1);
    }

    const deps = dependencies({ noAuthCheck: "true" });
    expect(await checkAdmin(deps)).toBe(bypassUser);
    expect(deps.getInternalAuth).not.toHaveBeenCalled();
    expect(deps.getSession).not.toHaveBeenCalled();
  });

  test("accepts a valid internal token without loading a session", async () => {
    const deps = dependencies({
      getInternalAuth: mock(async () => "token"),
      getInternalToken: mock(async () => "valid"),
    });

    expect(await checkAdmin(deps)).toBe(internalUser);
    expect(deps.getInternalToken).toHaveBeenCalledWith("token");
    expect(deps.getSession).not.toHaveBeenCalled();
  });

  test("falls back to an admin session when Redis fails", async () => {
    const admin: User = {
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
    };
    const deps = dependencies({
      getInternalAuth: mock(async () => "token"),
      getInternalToken: mock(async () => {
        throw new Error("Redis unavailable");
      }),
      getSession: mock(async () => ({ user: admin })),
    });

    expect(await checkAdmin(deps)).toBe(admin);
    expect(deps.getSession).toHaveBeenCalledTimes(1);
  });

  test("rejects missing and non-admin sessions", async () => {
    const nonAdmin = dependencies({
      getSession: mock(async () => ({
        user: { email: "user@example.com", name: "User", role: "user" },
      })),
    });

    expect(await checkAdmin(nonAdmin)).toBeNull();
    expect(await checkAdmin(dependencies())).toBeNull();
  });
});
