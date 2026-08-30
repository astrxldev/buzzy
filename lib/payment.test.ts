import { describe, expect, mock, test } from "bun:test";
import { checkSlip } from "./payment";

describe("checkSlip", () => {
  test("posts the image, amount, and authorization to the configured API", async () => {
    const payload = { success: true, data: { amount: 125.5 } };
    const fetcher = mock(async () => Response.json(payload));

    const result = await checkSlip(Buffer.from([0, 1, 2]), "image/png", 125.5, {
      fetch: fetcher as unknown as typeof fetch,
      apiUrl: "https://slip.test/check",
      apiKey: "secret",
    });

    expect(result as unknown).toEqual(payload);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://slip.test/check");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "x-authorization": "secret" });
    expect(init.body).toBeInstanceOf(FormData);

    const body = init.body as FormData;
    expect(body.get("amount")).toBe("125.5");
    const image = body.get("files");
    expect(image).toBeInstanceOf(File);
    expect(image).toMatchObject({ name: "image", type: "image/png", size: 3 });
    expect([...new Uint8Array(await (image as File).arrayBuffer())]).toEqual([
      0, 1, 2,
    ]);
  });

  test.each([
    [0, "0"],
    [-10, "-10"],
    [Number.NaN, "NaN"],
  ])("serializes amount %p as %s", async (amount, expected) => {
    const fetcher = mock(async (_url: unknown, init?: RequestInit) => {
      expect((init?.body as FormData).get("amount")).toBe(expected);
      return Response.json({});
    });
    await checkSlip(Buffer.from([]), "image/jpeg", amount, {
      fetch: fetcher as unknown as typeof fetch,
      apiUrl: "https://slip.test",
      apiKey: "key",
    });
  });

  test("returns JSON even when the HTTP response is unsuccessful", async () => {
    const payload = {
      success: false,
      code: 1001,
      message: "invalid slip",
    } as const;
    const fetcher = mock(async () => Response.json(payload, { status: 422 }));
    expect(
      await checkSlip(Buffer.from([]), "image/jpeg", 1, {
        fetch: fetcher as unknown as typeof fetch,
        apiUrl: "https://slip.test",
      }),
    ).toEqual(payload);
  });

  test("propagates fetch failures", async () => {
    const failure = new Error("offline");
    const fetcher = mock(async () => {
      throw failure;
    });
    expect(
      checkSlip(Buffer.from([]), "image/jpeg", 1, {
        fetch: fetcher as unknown as typeof fetch,
        apiUrl: "https://slip.test",
      }),
    ).rejects.toBe(failure);
  });

  test("propagates invalid JSON responses", async () => {
    const fetcher = mock(async () => new Response("not json"));
    expect(
      checkSlip(Buffer.from([]), "image/jpeg", 1, {
        fetch: fetcher as unknown as typeof fetch,
        apiUrl: "https://slip.test",
      }),
    ).rejects.toBeInstanceOf(SyntaxError);
  });

  test("fails before fetching when no API URL is configured", async () => {
    const original = process.env.SLIPOK_API_URL;
    const fetcher = mock(async () => Response.json({}));
    delete process.env.SLIPOK_API_URL;

    try {
      expect(
        checkSlip(Buffer.from([]), "image/jpeg", 1, {
          fetch: fetcher as unknown as typeof fetch,
        }),
      ).rejects.toThrow("SLIPOK_API_URL is not configured");
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) delete process.env.SLIPOK_API_URL;
      else process.env.SLIPOK_API_URL = original;
    }
  });
});
