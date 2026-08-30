import { describe, expect, mock, test } from "bun:test";
import { createSseHandler, tierListTopic } from "./handler";

const context = (topic: string) => ({ params: Promise.resolve({ topic }) });

function dependencies() {
  return {
    activeStream: mock(
      async (_options: { signal: AbortSignal }) => new Response("active"),
    ),
    logStream: mock(
      async (_options: { signal: AbortSignal }) => new Response("log"),
    ),
    tierStream: mock(
      async (_options: { signal: AbortSignal }) => new Response("tier"),
    ),
    adminCheck: mock(async () => true),
  };
}

describe("SSE handler", () => {
  test("the tier-list topic regex permits only intended identifier characters", () => {
    expect(tierListTopic.test("tl.genshin_5.0-beta")).toBeTrue();
    expect(tierListTopic.test("tl.bad/topic")).toBeFalse();
    expect(tierListTopic.test("tl.bad@topic")).toBeFalse();
    expect(tierListTopic.test("tl.")).toBeFalse();
  });

  test("streams a named endpoint with the request abort signal", async () => {
    const deps = dependencies();
    const request = new Request("https://buzz.test/sse/active");
    const handler = createSseHandler({
      endpoints: { active: { stream: deps.activeStream } },
      adminTopics: [],
      adminCheck: deps.adminCheck,
      tierListEndpoint: () => ({ stream: deps.tierStream }),
    });
    expect(await (await handler(request, context("active"))).text()).toBe(
      "active",
    );
    expect(deps.activeStream).toHaveBeenCalledWith({ signal: request.signal });
  });

  test("rejects an unknown endpoint", async () => {
    const deps = dependencies();
    const response = await createSseHandler({
      endpoints: {},
      adminTopics: [],
      adminCheck: deps.adminCheck,
      tierListEndpoint: () => ({ stream: deps.tierStream }),
    })(new Request("https://buzz.test/sse/nope"), context("nope"));
    expect(response.status).toBe(404);
  });

  test("protects admin endpoints", async () => {
    const deps = dependencies();
    deps.adminCheck.mockResolvedValue(false);
    const response = await createSseHandler({
      endpoints: { log: { stream: deps.logStream } },
      adminTopics: ["log"],
      adminCheck: deps.adminCheck,
      tierListEndpoint: () => ({ stream: deps.tierStream }),
    })(new Request("https://buzz.test/sse/log"), context("log"));
    expect(response.status).toBe(401);
    expect(deps.logStream).not.toHaveBeenCalled();
  });

  test("extracts a tier-list id and forwards the abort signal", async () => {
    const deps = dependencies();
    const getTier = mock((_id: string) => ({ stream: deps.tierStream }));
    const request = new Request("https://buzz.test/sse/tl.list-1");
    await createSseHandler({
      endpoints: {},
      adminTopics: [],
      adminCheck: deps.adminCheck,
      tierListEndpoint: getTier,
    })(request, context("tl.list-1"));
    expect(getTier).toHaveBeenCalledWith("list-1");
    expect(deps.tierStream).toHaveBeenCalledWith({ signal: request.signal });
  });
});
