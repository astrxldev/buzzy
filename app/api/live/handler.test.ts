import { describe, expect, mock, test } from "bun:test";
import { createLiveHandler } from "./handler";

const liveRequest = (query = "") =>
  new Request(`https://example.com/api/live${query}`);
const youtubeResult = (
  thumbnails: Record<string, unknown> = {
    high: { url: "https://img/high.jpg", width: 480, height: 360 },
  },
) => ({
  items: [
    {
      id: { videoId: "video-1" },
      snippet: { title: "Live title", thumbnails },
    },
  ],
});

describe("live handler", () => {
  test("returns none without calling YouTube when configuration is missing", async () => {
    const fetch = mock(() => Promise.resolve(Response.json({})));
    const handler = createLiveHandler({
      fetch,
      publish: mock(() => {}),
      getConfig: () => ({ apiKey: "", channelId: "channel" }),
    });
    expect(await (await handler(liveRequest())).json()).toBe("none");
    expect(fetch).not.toHaveBeenCalled();
  });

  test("builds an encoded YouTube request and publishes a live result", async () => {
    const fetch = mock((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(Response.json(youtubeResult())),
    );
    const publish = mock(() => {});
    const handler = createLiveHandler({
      fetch,
      publish,
      getConfig: () => ({ apiKey: "key +", channelId: "channel/id" }),
    });
    const response = await handler(liveRequest());
    const result = await response.json();

    expect(fetch.mock.calls[0]?.[0]).toContain("channelId=channel%2Fid");
    expect(fetch.mock.calls[0]?.[0]).toContain("key=key%20%2B");
    expect(fetch.mock.calls[0]?.[1]).toEqual({ cache: "no-store" });
    expect(result).toEqual({
      url: "https://www.youtube.com/watch?v=video-1",
      thumbnails: {
        url: "https://img/high.jpg",
        width: 480,
        height: 360,
      },
      title: "Live title",
    });
    expect(publish).toHaveBeenCalledWith(result);
  });

  test("returns none and logs an upstream error", async () => {
    const logError = mock(() => {});
    const handler = createLiveHandler({
      fetch: mock(() =>
        Promise.resolve(
          new Response(null, { status: 403, statusText: "Nope" }),
        ),
      ),
      publish: mock(() => {}),
      getConfig: () => ({ apiKey: "key", channelId: "channel" }),
      logError,
    });
    expect(await (await handler(liveRequest())).json()).toBe("none");
    expect(logError).toHaveBeenCalledWith("YouTube API error: Nope");
  });

  test("returns none for an empty search", async () => {
    const publish = mock(() => {});
    const handler = createLiveHandler({
      fetch: mock(() => Promise.resolve(Response.json({ items: [] }))),
      publish,
      getConfig: () => ({ apiKey: "key", channelId: "channel" }),
    });
    expect(await (await handler(liveRequest())).json()).toBe("none");
    expect(publish).not.toHaveBeenCalled();
  });

  test("returns none when YouTube supplies no thumbnail", async () => {
    const handler = createLiveHandler({
      fetch: mock(() => Promise.resolve(Response.json(youtubeResult({})))),
      publish: mock(() => {}),
      getConfig: () => ({ apiKey: "key", channelId: "channel" }),
    });
    expect(await (await handler(liveRequest())).json()).toBe("none");
  });

  test("last returns a clone of the last successful local response", async () => {
    let configured = true;
    const fetch = mock(() => Promise.resolve(Response.json(youtubeResult())));
    const handler = createLiveHandler({
      fetch,
      publish: mock(() => {}),
      getConfig: () =>
        configured
          ? { apiKey: "key", channelId: "channel" }
          : { apiKey: undefined, channelId: undefined },
    });
    const first = await handler(liveRequest());
    configured = false;
    const last = await handler(liveRequest("?last=true"));

    expect(last).not.toBe(first);
    expect(await last.json()).toEqual(await first.json());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("last performs a normal lookup before any successful response", async () => {
    const fetch = mock(() => Promise.resolve(Response.json({ items: [] })));
    const handler = createLiveHandler({
      fetch,
      publish: mock(() => {}),
      getConfig: () => ({ apiKey: "key", channelId: "channel" }),
    });
    expect(await (await handler(liveRequest("?last"))).json()).toBe("none");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("an unsuccessful refresh does not replace the last response", async () => {
    const fetch = mock()
      .mockResolvedValueOnce(Response.json(youtubeResult()))
      .mockResolvedValueOnce(Response.json({ items: [] }));
    const handler = createLiveHandler({
      fetch,
      publish: mock(() => {}),
      getConfig: () => ({ apiKey: "key", channelId: "channel" }),
    });
    await handler(liveRequest());
    expect(await (await handler(liveRequest())).json()).toBe("none");
    expect(await (await handler(liveRequest("?last"))).json()).toMatchObject({
      title: "Live title",
    });
  });
});
