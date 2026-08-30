import { describe, expect, mock, test } from "bun:test";
import { createAuthHandlers } from "./handler";

describe("auth route factory", () => {
  test("creates both handlers from the provided auth instance", async () => {
    const auth = { name: "auth" };
    const get = mock(async (_request: Request) => new Response("GET"));
    const post = mock(async (_request: Request) => new Response("POST"));
    const adapter = mock((_auth: typeof auth) => ({ GET: get, POST: post }));
    const handlers = createAuthHandlers(adapter, auth);
    expect(adapter).toHaveBeenCalledWith(auth);
    expect(
      await (await handlers.GET(new Request("https://buzz.test"))).text(),
    ).toBe("GET");
    expect(
      await (
        await handlers.POST(
          new Request("https://buzz.test", { method: "POST" }),
        )
      ).text(),
    ).toBe("POST");
  });
});
