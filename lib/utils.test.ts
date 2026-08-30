import { describe, expect, test } from "bun:test";
import {
  b2s,
  cn,
  fileToDataUrl,
  parseSearchNumber,
  parseSearchString,
  pausePass,
  ResponseNotOkError,
  shortestPrefixes,
  throwNotOk,
} from "./utils";

describe("cn", () => {
  test("combines conditional classes and resolves Tailwind conflicts", () => {
    expect(
      cn("block", false && "hidden", ["px-2", { flex: true }], "px-4"),
    ).toBe("flex px-4");
  });

  test("returns an empty string without classes", () => {
    expect(cn()).toBe("");
  });
});

describe("b2s", () => {
  test.each([
    [0, "0.0 B"],
    [1, "1.0 B"],
    [1023, "1023.0 B"],
    [1024, "1.0KB"],
    [1536, "1.5KB"],
    [1024 ** 2, "1.0MB"],
    [1024 ** 3, "1.0GB"],
    [1024 ** 4, "1.0PB"],
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(b2s(bytes)).toBe(expected);
  });
});

describe("shortestPrefixes", () => {
  test("finds the shortest distinguishing prefixes", () => {
    expect([...shortestPrefixes(["apple", "apricot", "banana"])]).toEqual([
      ["apple", "app"],
      ["apricot", "apr"],
      ["banana", "b"],
    ]);
  });

  test("handles values that are prefixes of other values", () => {
    expect([...shortestPrefixes(["a", "ab", "abc"])]).toEqual([
      ["a", "a"],
      ["ab", "ab"],
      ["abc", "abc"],
    ]);
  });

  test("deduplicates while preserving first-seen order", () => {
    expect([...shortestPrefixes(["cat", "dog", "cat", "door"])]).toEqual([
      ["cat", "c"],
      ["dog", "dog"],
      ["door", "doo"],
    ]);
  });

  test("supports empty input, empty values, and Unicode code points", () => {
    expect(shortestPrefixes([]).size).toBe(0);
    expect(shortestPrefixes([""]).get("")).toBe("");
    expect([...shortestPrefixes(["😀a", "😀b"]).values()]).toEqual([
      "😀a",
      "😀b",
    ]);
  });
});

describe("fileToDataUrl", () => {
  test("encodes file bytes and MIME type", async () => {
    const file = new File([new Uint8Array([0, 1, 2, 255])], "bytes.bin", {
      type: "application/octet-stream",
    });
    expect(await fileToDataUrl(file)).toBe(
      "data:application/octet-stream;base64,AAEC/w==",
    );
  });

  test("supports empty files without a MIME type", async () => {
    expect(await fileToDataUrl(new File([], "empty"))).toBe("data:;base64,");
  });
});

describe("search parameter parsers", () => {
  test.each([
    ["12.5", 0, 12.5],
    ["12px", 0, 12],
    ["", 7, 7],
    [undefined, -1, -1],
  ] as const)("parses numeric parameter %p", (param, fallback, expected) => {
    expect(parseSearchNumber(param, fallback)).toBe(expected);
  });

  test("uses the first numeric array value", () => {
    expect(parseSearchNumber(["bad", "5"], 3)).toBe(3);
    expect(parseSearchNumber([], 4)).toBe(4);
  });

  test("preserves infinities accepted by parseFloat", () => {
    expect(parseSearchNumber("Infinity")).toBe(Number.POSITIVE_INFINITY);
  });

  test.each([
    ["value", "fallback", "value"],
    ["", "fallback", ""],
    [undefined, "fallback", "fallback"],
  ] as const)("parses string parameter %p", (param, fallback, expected) => {
    expect(parseSearchString(param, fallback)).toBe(expected);
  });

  test("uses the first string array value", () => {
    expect(parseSearchString(["first", "second"])).toBe("first");
    expect(parseSearchString([], "fallback")).toBe("fallback");
  });
});

describe("pausePass", () => {
  test("resolves with the same value after the delay", async () => {
    const value = { id: 1 };
    const promise = pausePass<typeof value>(1)(value);
    expect(promise).toBeInstanceOf(Promise);
    expect(await promise).toBe(value);
  });
});

describe("throwNotOk", () => {
  test("returns the same successful response", () => {
    const response = new Response("ok", { status: 200 });
    expect(throwNotOk(response)).toBe(response);
  });

  test.each([400, 404, 500])("throws a typed error for status %d", (status) => {
    const response = new Response("failure", { status });
    try {
      throwNotOk(response);
      throw new Error("expected throwNotOk to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ResponseNotOkError);
      expect(error).toMatchObject({ status, response });
      expect((error as Error).message).toBe(
        `RESPONSE_NOT_OK: Got status ${status}`,
      );
    }
  });
});
