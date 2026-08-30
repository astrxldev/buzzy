import { describe, expect, mock, test } from "bun:test";
import { createGuideHandler } from "./handler";

const valid = {
  name: "Guide One",
  link: "https://guide.test/one",
  imageUrl: "https://img.test/one.png",
};
const request = (body: unknown) =>
  new Request("https://buzz.test/api/guide", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

function dependencies() {
  return {
    adminCheck: mock(async () => true),
    fetch: mock(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(new Blob(["image"])),
    ),
    saveGuide: mock(async (_guide: typeof valid, _image: Blob) => {}),
    actionLog: mock(async (_message: string, _details: unknown) => {}),
    revalidatePath: mock((_path: string) => {}),
  };
}

describe("guide handler", () => {
  test("rejects anonymous requests before parsing or fetching", async () => {
    const deps = dependencies();
    deps.adminCheck.mockResolvedValue(false);
    const response = await createGuideHandler(deps)(request(valid));
    expect(response.status).toBe(401);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  test("rejects malformed JSON and invalid URLs", async () => {
    const deps = dependencies();
    const malformed = new Request("https://buzz.test/api/guide", {
      method: "POST",
      body: "{",
    });
    expect((await createGuideHandler(deps)(malformed)).status).toBe(422);
    expect(
      (await createGuideHandler(deps)(request({ ...valid, link: "nope" })))
        .status,
    ).toBe(422);
    expect(deps.saveGuide).not.toHaveBeenCalled();
  });

  test("rejects a non-OK image response without writing", async () => {
    const deps = dependencies();
    deps.fetch.mockResolvedValue(new Response("missing", { status: 404 }));
    const response = await createGuideHandler(deps)(request(valid));
    expect(response.status).toBe(502);
    expect(deps.saveGuide).not.toHaveBeenCalled();
    expect(deps.actionLog).not.toHaveBeenCalled();
  });

  test("stores, logs, and revalidates a valid guide", async () => {
    const deps = dependencies();
    const response = await createGuideHandler(deps)(request(valid));
    expect(response.status).toBe(200);
    expect(deps.fetch).toHaveBeenCalledWith(valid.imageUrl);
    expect(deps.saveGuide.mock.calls[0]?.[0]).toEqual(valid);
    expect(deps.saveGuide.mock.calls[0]?.[1]).toBeInstanceOf(Blob);
    expect(deps.actionLog).toHaveBeenCalledWith("API Added guide Guide One", {
      link: valid.link,
      imageUrl: valid.imageUrl,
    });
    expect(deps.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      "/guide",
      "/admin/guide",
    ]);
  });
});
