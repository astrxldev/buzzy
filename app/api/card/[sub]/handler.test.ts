import { describe, expect, mock, test } from "bun:test";
import {
  type CardCharacter,
  type CardSubmission,
  createCardHandler,
} from "./handler";

const context = (sub: string) => ({ params: Promise.resolve({ sub }) });
const request = new Request("https://buzz.test/api/card/sub-1");

function dependencies() {
  return {
    findSubmission: mock(
      async (_id: string): Promise<CardSubmission | undefined> => ({
        uid: "800000001",
        char: "Furina",
      }),
    ),
    findImage: mock(
      async (_id: string): Promise<Uint8Array<ArrayBuffer> | undefined> =>
        undefined,
    ),
    findCharacter: mock(
      async (_name: string): Promise<CardCharacter | undefined> => ({
        amber: "10000089-Furina",
      }),
    ),
    fetch: mock(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(new Uint8Array([4, 5, 6])),
    ),
    persistImage: mock(async (_id: string, _image: ArrayBuffer) => {}),
    after: mock((task: () => Promise<void>) => void task()),
  };
}

describe("card handler", () => {
  test("returns a cached card without querying character services", async () => {
    const deps = dependencies();
    deps.findImage.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const response = await createCardHandler(deps)(request, context("cached"));
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(deps.findCharacter).not.toHaveBeenCalled();
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  test("identifies an unknown submission by the requested id", async () => {
    const deps = dependencies();
    deps.findSubmission.mockResolvedValue(undefined);
    const response = await createCardHandler(deps)(request, context("missing"));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Unknown submission: missing");
  });

  test("rejects submissions without a character", async () => {
    const deps = dependencies();
    deps.findSubmission.mockResolvedValue({ uid: "1", char: null });
    const response = await createCardHandler(deps)(request, context("generic"));
    expect(response.status).toBe(422);
    expect(deps.findCharacter).not.toHaveBeenCalled();
  });

  test("reports a missing character record", async () => {
    const deps = dependencies();
    deps.findCharacter.mockResolvedValue(undefined);
    const response = await createCardHandler(deps)(request, context("sub-1"));
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Unknown character: Furina");
  });

  test("returns upstream errors unchanged", async () => {
    const deps = dependencies();
    deps.fetch.mockResolvedValue(new Response("busy", { status: 503 }));
    const response = await createCardHandler(deps)(request, context("sub-1"));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("busy");
    expect(deps.persistImage).not.toHaveBeenCalled();
  });

  test("fetches and schedules persistence of a fresh card", async () => {
    const deps = dependencies();
    const response = await createCardHandler(deps)(request, context("sub-1"));
    expect(deps.fetch.mock.calls[0]?.[0]).toBe(
      "https://api.astrxl.dev/v1/card/genshin/800000001/10000089?lang=th&substat=true&quality=true",
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([4, 5, 6]),
    );
    expect(deps.after).toHaveBeenCalledTimes(1);
    expect(deps.persistImage).toHaveBeenCalledTimes(1);
    expect(deps.persistImage.mock.calls[0]?.[0]).toBe("sub-1");
  });
});
