import { describe, expect, mock, test } from "bun:test";
import { fetchToCdnService, responseToFile } from "./service";

function response(
  headers: HeadersInit = {},
  options: { status?: number; url?: string } = {},
) {
  const result = new Response("file-data", {
    status: options.status ?? 200,
    headers,
  });
  if (options.url) Object.defineProperty(result, "url", { value: options.url });
  return result;
}

describe("responseToFile", () => {
  test("prefers the content-disposition filename", async () => {
    const file = await responseToFile(
      response({
        "Content-Disposition": 'attachment; filename="report final.pdf"',
      }),
    );
    expect(file.name).toBe("report final.pdf");
  });

  test("uses the decoded final URL filename after redirects", async () => {
    const file = await responseToFile(
      response({}, { url: "https://cdn.test/assets/my%20image.png" }),
    );
    expect(file.name).toBe("my image.png");
  });

  test("falls back to the response content type", async () => {
    const file = await responseToFile(
      response({ "Content-Type": "image/webp; charset=binary" }),
    );
    expect(file.name).toBe("file.webp");
    expect(file.type).toBe("image/webp");
  });

  test("rejects non-success status responses", async () => {
    expect(responseToFile(response({}, { status: 404 }))).rejects.toThrow(
      "404",
    );
  });
});

describe("fetchToCdnService", () => {
  test("requires admin before fetching or opening a transaction", async () => {
    const fetch = mock(async (_url: string) => response());
    let transactionCalled = false;
    expect(
      fetchToCdnService(["https://cdn.test/file"], {
        adminCheck: async () => false,
        fetch,
        transaction: async (callback) => {
          transactionCalled = true;
          return callback({});
        },
        importFile: async () => "id",
        afterImport: async () => {},
      }),
    ).rejects.toBe("Unauthorized");
    expect(fetch).not.toHaveBeenCalled();
    expect(transactionCalled).toBe(false);
  });

  test("imports every file in one transaction and refreshes afterward", async () => {
    const transactionObject = { id: "tx" };
    const imported: string[] = [];
    let refreshed = false;
    const result = await fetchToCdnService(
      ["https://cdn.test/a", "https://cdn.test/b"],
      {
        adminCheck: async () => true,
        fetch: async (url) =>
          response({
            "Content-Disposition": `attachment; filename=${url.at(-1)}.txt`,
          }),
        transaction: async (callback) => callback(transactionObject),
        importFile: async (file, tx) => {
          expect(tx).toBe(transactionObject);
          imported.push(file.name);
          return file.name;
        },
        afterImport: async () => {
          refreshed = true;
        },
      },
    );

    expect(result).toEqual(["a.txt", "b.txt"]);
    expect(imported).toEqual(["a.txt", "b.txt"]);
    expect(refreshed).toBe(true);
  });

  test("refreshes after a failed download", async () => {
    const afterImport = mock(async () => {});
    expect(
      fetchToCdnService(["https://cdn.test/missing"], {
        adminCheck: async () => true,
        fetch: async () => response({}, { status: 503 }),
        transaction: async (callback) => callback({}),
        importFile: async () => "id",
        afterImport,
      }),
    ).rejects.toThrow("503");
    expect(afterImport).toHaveBeenCalledTimes(1);
  });
});
