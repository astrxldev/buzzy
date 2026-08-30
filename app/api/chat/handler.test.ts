import { describe, expect, mock, test } from "bun:test";
import { createChatHandler } from "./handler";

const request = () => new Request("https://example.com/api/chat");

describe("chat handler", () => {
  test("fetches the live endpoint without caching and redirects to popout chat", async () => {
    const fetch = mock((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(
        Response.json({ url: "https://youtube.com/watch?v=abc_123&feature=x" }),
      ),
    );

    const response = await createChatHandler({ fetch })(request());

    expect(fetch).toHaveBeenCalledWith("https://buzz.sudloh.com/api/live", {
      cache: "no-store",
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://studio.youtube.com/live_chat?is_popout=1&v=abc_123",
    );
  });

  test("returns 502 when the live endpoint fails", async () => {
    const handler = createChatHandler({
      fetch: mock(() => Promise.resolve(new Response(null, { status: 500 }))),
    });
    const response = await handler(request());
    expect(response.status).toBe(502);
    expect(await response.text()).toBe("Failed to get live stream.");
  });

  test("returns 404 when there is no live stream", async () => {
    const handler = createChatHandler({
      fetch: mock(() => Promise.resolve(Response.json("none"))),
    });
    const response = await handler(request());
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("No live stream");
  });

  test.each([
    { url: "https://youtube.com/watch?feature=x" },
    { url: "not a url" },
  ])("returns 502 for a live URL without a usable video id", async (live) => {
    const handler = createChatHandler({
      fetch: mock(() => Promise.resolve(Response.json(live))),
    });
    const response = await handler(request());
    expect(response.status).toBe(502);
    expect(await response.text()).toContain("video id was not found");
  });

  test("encodes the video id in the redirect URL", async () => {
    const handler = createChatHandler({
      fetch: mock(() =>
        Promise.resolve(
          Response.json({ url: "https://youtube.com/watch?v=a%26b" }),
        ),
      ),
    });
    expect((await handler(request())).headers.get("location")).toEndWith(
      "v=a%26b",
    );
  });
});
