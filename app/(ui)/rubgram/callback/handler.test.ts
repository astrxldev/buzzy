import { describe, expect, mock, test } from "bun:test";
import { createRubgramCallbackHandler } from "./handler";

const config = {
  clientId: "client",
  clientSecret: "secret",
  redirectUri: "https://buzz.test/rubgram/callback",
  guildId: "guild",
  botToken: "bot",
};

function dependencies() {
  const responses = [
    Response.json({ access_token: "access" }),
    Response.json({ id: "user-1", username: "user", global_name: "Display" }),
    new Response(null, { status: 200 }),
  ];
  return {
    config,
    fetch: mock(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        responses.shift()!,
    ),
    getState: mock((): string | undefined => "expected"),
    clearState: mock(() => {}),
    setSession: mock((_token: string) => {}),
    saveUser: mock(
      async (_user: { uid: string; display: string; username: string }) =>
        "session",
    ),
    redirect: mock(
      (path: string) =>
        new Response(null, { status: 307, headers: { Location: path } }),
    ),
    logError: mock((_message: string, _error?: unknown) => {}),
  };
}

const request = (query: string) =>
  new Request(`https://buzz.test/rubgram/callback?${query}`);

describe("Rubgram Discord callback", () => {
  test("redirects an OAuth denial without exchanging a token", async () => {
    const deps = dependencies();
    const response = await createRubgramCallbackHandler(deps)(
      request("error=access_denied&state=expected"),
    );
    expect(response.status).toBe(307);
    expect(deps.clearState).toHaveBeenCalledTimes(1);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  test("requires an authorization code", async () => {
    const deps = dependencies();
    const response = await createRubgramCallbackHandler(deps)(
      request("state=expected"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "No code provided" });
  });

  test("rejects missing, mismatched, and unissued OAuth state", async () => {
    for (const [query, expected] of [
      ["code=abc", "expected"],
      ["code=abc&state=wrong", "expected"],
      ["code=abc&state=expected", undefined],
    ] as const) {
      const deps = dependencies();
      deps.getState.mockReturnValue(expected);
      const response = await createRubgramCallbackHandler(deps)(request(query));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid OAuth state" });
      expect(deps.clearState).toHaveBeenCalledTimes(1);
      expect(deps.fetch).not.toHaveBeenCalled();
    }
  });

  test("exchanges a valid callback, stores the user, and sets the session", async () => {
    const deps = dependencies();
    const response = await createRubgramCallbackHandler(deps)(
      request("code=abc&state=expected"),
    );
    expect(response.status).toBe(307);
    expect(deps.fetch).toHaveBeenCalledTimes(3);
    expect(deps.fetch.mock.calls[0]?.[0]).toBe(
      "https://discord.com/api/oauth2/token",
    );
    const tokenInit = deps.fetch.mock.calls[0]?.[1];
    expect(tokenInit?.method).toBe("POST");
    expect((tokenInit?.body as URLSearchParams).get("code")).toBe("abc");
    expect(deps.saveUser).toHaveBeenCalledWith({
      uid: "user-1",
      username: "user",
      display: "Display",
    });
    expect(deps.setSession).toHaveBeenCalledWith("session");
    expect(deps.redirect).toHaveBeenCalledWith("/rubgram");
  });

  test("adds a user who is not already a guild member", async () => {
    const deps = dependencies();
    deps.fetch
      .mockResolvedValueOnce(Response.json({ access_token: "access" }))
      .mockResolvedValueOnce(Response.json({ id: "user-1", username: "user" }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    await createRubgramCallbackHandler(deps)(
      request("code=abc&state=expected"),
    );
    expect(deps.fetch).toHaveBeenCalledTimes(4);
    expect(deps.fetch.mock.calls[3]?.[0]).toBe(
      "https://discord.com/api/guilds/guild/members/user-1",
    );
    expect(deps.fetch.mock.calls[3]?.[1]?.method).toBe("PUT");
  });

  test("returns a stable error without storing a user when Discord fails", async () => {
    const deps = dependencies();
    deps.fetch.mockReset();
    deps.fetch.mockResolvedValue(new Response("bad", { status: 401 }));
    const response = await createRubgramCallbackHandler(deps)(
      request("code=abc&state=expected"),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Authentication failed" });
    expect(deps.saveUser).not.toHaveBeenCalled();
    expect(deps.setSession).not.toHaveBeenCalled();
    expect(deps.logError).toHaveBeenCalledTimes(1);
  });
});
