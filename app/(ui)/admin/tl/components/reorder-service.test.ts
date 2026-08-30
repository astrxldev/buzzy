import { describe, expect, test } from "bun:test";
import { plannedOrderUpdates } from "./order";
import { reorderService } from "./reorder-service";

const items = [
  { id: "a", order: 10 },
  { id: "b", order: 20 },
  { id: "c", order: 30 },
];

describe("plannedOrderUpdates", () => {
  test("uses a midpoint when sufficient order space exists", () => {
    expect(plannedOrderUpdates(items, ["b", "a", "c"], "a", "stale")).toEqual([
      { id: "a", order: 25 },
    ]);
  });

  test("normalizes every item when adjacent orders have no midpoint", () => {
    expect(
      plannedOrderUpdates(
        [
          { id: "a", order: 1 },
          { id: "b", order: 2 },
          { id: "c", order: 3 },
        ],
        ["b", "a", "c"],
        "a",
        "stale",
      ),
    ).toEqual([
      { id: "b", order: 10 },
      { id: "a", order: 20 },
      { id: "c", order: 30 },
    ]);
  });

  test.each([
    { ids: [] as string[] },
    { ids: ["a", "a", "c"] },
    { ids: ["a", "b"] },
    { ids: ["a", "b", "stale"] },
    { ids: ["a", "b", "c", "extra"] },
  ])("rejects malformed, duplicate, or stale IDs: %p", ({ ids }) => {
    expect(() => plannedOrderUpdates(items, ids, "a", "refresh")).toThrow(
      "refresh",
    );
  });

  test("rejects an active ID absent from an otherwise valid order", () => {
    expect(() =>
      plannedOrderUpdates(items, ["a", "b", "c"], "missing", "stale"),
    ).toThrow("Moved item is missing");
  });
});

describe("reorderService", () => {
  test("requires admin before opening a transaction", async () => {
    let transactionCalled = false;
    expect(
      reorderService("a", ["a"], "stale", {
        adminCheck: async () => false,
        transaction: async (callback) => {
          transactionCalled = true;
          return callback({
            list: async () => [],
            update: async () => {},
          });
        },
        afterReorder: async () => {},
      }),
    ).rejects.toBe("Unauthorized");
    expect(transactionCalled).toBe(false);
  });

  test("applies planned updates atomically before side effects", async () => {
    const calls: string[] = [];
    await reorderService("a", ["b", "a", "c"], "stale", {
      adminCheck: async () => true,
      transaction: async (callback) => {
        await callback({
          list: async () => items,
          update: async (id, order) => {
            calls.push(`update:${id}:${order}`);
          },
        });
      },
      afterReorder: async () => {
        calls.push("after");
      },
    });
    expect(calls).toEqual(["update:a:25", "after"]);
  });
});
