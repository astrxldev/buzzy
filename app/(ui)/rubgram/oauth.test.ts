import { expect, test } from "bun:test";
import { discordAuthorizationUrl } from "./oauth";

test("Discord authorization URL carries the callback and CSRF state", () => {
  const url = new URL(
    discordAuthorizationUrl({
      clientId: "client id",
      redirectUri: "https://buzz.test/rubgram/callback",
      state: "random-state",
    }),
  );
  expect(url.origin + url.pathname).toBe(
    "https://discord.com/oauth2/authorize",
  );
  expect(url.searchParams.get("client_id")).toBe("client id");
  expect(url.searchParams.get("redirect_uri")).toBe(
    "https://buzz.test/rubgram/callback",
  );
  expect(url.searchParams.get("state")).toBe("random-state");
  expect(url.searchParams.get("scope")).toBe("identify guilds.join guilds");
});
