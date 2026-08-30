import { describe, expect, test } from "bun:test";
import {
  adminExists,
  decideCardFailure,
  decideRubgramWebhook,
  getScheduleDelay,
  isDatabaseSeeded,
  parseSubscriberMessage,
  shouldRunDatabaseSeed,
} from "./logic";

describe("getScheduleDelay", () => {
  const now = new Date("2026-01-01T00:00:00.000Z").getTime();

  test("converts numeric seconds to milliseconds", () => {
    expect(getScheduleDelay(0, now)).toBe(0);
    expect(getScheduleDelay(60, now)).toBe(60_000);
    expect(getScheduleDelay(0.5, now)).toBe(500);
  });

  test("polls in one minute when there are no target dates", () => {
    expect(getScheduleDelay([], now)).toBe(60_000);
  });

  test("uses the nearest date regardless of input order", () => {
    expect(
      getScheduleDelay(
        [
          new Date(now + 30_000),
          new Date(now + 10_000),
          new Date(now + 20_000),
        ],
        now,
      ),
    ).toBe(10_000);
  });

  test("retains immediate past deadlines and hourly polling for distant dates", () => {
    expect(getScheduleDelay([new Date(now - 1)], now)).toBe(-1);
    expect(getScheduleDelay([new Date(now + 7_200_000)], now)).toBe(3_600_000);
  });
});

describe("database seed decisions", () => {
  test("runs only in development", () => {
    expect(shouldRunDatabaseSeed("development")).toBeTrue();
    expect(shouldRunDatabaseSeed("production")).toBeFalse();
    expect(shouldRunDatabaseSeed(undefined)).toBeFalse();
  });

  test("distinguishes empty query results from existing rows", () => {
    expect(isDatabaseSeeded([])).toBeFalse();
    expect(isDatabaseSeeded([{ id: true }])).toBeTrue();
    expect(adminExists([])).toBeFalse();
    expect(adminExists([{ id: "admin" }])).toBeTrue();
  });
});

describe("decideCardFailure", () => {
  test.each([
    [
      "The showcase for this UID is private",
      "ผู้เล่นนี้ไม่มีโชว์เคส มองไม่เห็นตัวละครใดๆ",
      true,
    ],
    [
      "Character not found in showcase",
      "ตัวละครที่ผู้เล่นเลือก ไม่ได้อยู่ในโชว์เคส",
      false,
    ],
    ["Invalid UID Provided", "ผู้เล่นนี้ไม่มีอยู่จริง โดนแบนไปแล้วรีเปล่า", false],
  ])("translates known card error %s", (input, error, stopRetrying) => {
    expect(decideCardFailure(input, 500)).toEqual({ error, stopRetrying });
  });

  test("stops retrying all HTTP 400 responses", () => {
    expect(decideCardFailure("bad request", 400)).toEqual({
      error: "bad request",
      stopRetrying: true,
    });
  });

  test("uses a retry message for gateway failures and oversized bodies", () => {
    const expected = {
      error: "ไม่สามารถสร้างการ์ดได้ กำลังพยายามลองใหม่",
      stopRetrying: false,
    };
    expect(decideCardFailure("upstream", 502)).toEqual(expected);
    expect(decideCardFailure("x".repeat(2001), 500)).toEqual(expected);
    expect(decideCardFailure("x".repeat(2000), 500).error).toHaveLength(2000);
  });

  test("stores only the first line of an unknown response", () => {
    expect(decideCardFailure("first line\nstack trace", 500)).toEqual({
      error: "first line",
      stopRetrying: false,
    });
  });
});

describe("Redis subscriber decisions", () => {
  test("parses a valid subscriber envelope", () => {
    expect(
      parseSubscriberMessage(
        JSON.stringify({
          event: "update",
          data: { type: "submit", sub: "s1" },
        }),
      ),
    ).toEqual({ event: "update", data: { type: "submit", sub: "s1" } });
  });

  test.each([
    "not json",
    "null",
    "[]",
    JSON.stringify({ event: "update" }),
    JSON.stringify({ event: 1, data: {} }),
  ])("rejects malformed payload %s", (payload) => {
    expect(parseSubscriberMessage(payload)).toBeNull();
  });

  test.each([
    "submit",
    "paid",
  ] as const)("allows configured %s updates", (type) => {
    expect(
      decideRubgramWebhook(
        { event: "update", data: { type, sub: "submission-1" } },
        "https://webhook.test",
      ),
    ).toEqual({ type, sub: "submission-1" });
  });

  test.each([
    [{ event: "other", data: { type: "submit", sub: "s1" } }, "url"],
    [{ event: "update", data: { type: "cancel", sub: "s1" } }, "url"],
    [{ event: "update", data: { type: "submit" } }, "url"],
    [{ event: "update", data: null }, "url"],
    [{ event: "update", data: { type: "submit", sub: "s1" } }, undefined],
  ] as const)("ignores ineligible message %#", (message, webhookUrl) => {
    expect(decideRubgramWebhook(message, webhookUrl)).toBeNull();
  });
});
