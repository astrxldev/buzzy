import { describe, expect, test } from "bun:test";
import {
  midpointOrder,
  normalizedOrders,
  ORDER_STEP,
  reorderFlatItems,
} from "./order";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

describe("reorderFlatItems", () => {
  test.each([
    ["a", "d", ["b", "c", "d", "a"]],
    ["d", "a", ["d", "a", "b", "c"]],
    ["b", "c", ["a", "c", "b", "d"]],
    ["c", "b", ["a", "c", "b", "d"]],
  ])("moves %s over %s", (active, over, expected) => {
    const result = reorderFlatItems(items, active, over);
    expect(result.map(({ id }) => id)).toEqual(expected);
    expect(result).not.toBe(items);
    expect(items.map(({ id }) => id)).toEqual(["a", "b", "c", "d"]);
  });

  test("returns the original array when IDs are equal", () => {
    expect(reorderFlatItems(items, "b", "b")).toBe(items);
  });

  test.each([
    ["missing", "a"],
    ["a", "missing"],
    ["missing", "other"],
  ])("returns the original array for unknown IDs", (active, over) => {
    expect(reorderFlatItems(items, active, over)).toBe(items);
  });

  test("moves the first matching item when IDs are duplicated", () => {
    const duplicate = [
      { id: "a", value: 1 },
      { id: "a", value: 2 },
      { id: "b", value: 3 },
    ];
    expect(
      reorderFlatItems(duplicate, "a", "b").map(({ value }) => value),
    ).toEqual([2, 3, 1]);
  });

  test("handles an empty array", () => {
    const empty: { id: string }[] = [];
    expect(reorderFlatItems(empty, "a", "b")).toBe(empty);
  });
});

describe("midpointOrder", () => {
  test.each([
    [undefined, undefined, ORDER_STEP],
    [undefined, 30, 20],
    [20, undefined, 30],
    [10, 30, 20],
    [10, 31, 20],
    [-20, -10, -15],
    [0, 1, null],
    [1, 2, null],
    [-2, -1, null],
    [10, 10, null],
  ] as const)("returns %p between %p and %p", (prev, next, expected) => {
    expect(midpointOrder(prev, next)).toBe(expected);
  });

  test("treats null like a missing boundary", () => {
    expect(midpointOrder(null as unknown as undefined, 20)).toBe(10);
    expect(midpointOrder(20, null as unknown as undefined)).toBe(30);
  });
});

describe("normalizedOrders", () => {
  test("assigns stable ORDER_STEP increments", () => {
    expect(normalizedOrders(["c", "a", "b"])).toEqual([
      { id: "c", order: 10 },
      { id: "a", order: 20 },
      { id: "b", order: 30 },
    ]);
  });

  test("returns an empty list for no IDs", () => {
    expect(normalizedOrders([])).toEqual([]);
  });

  test("preserves duplicate and empty IDs", () => {
    expect(normalizedOrders(["", "x", "x"])).toEqual([
      { id: "", order: 10 },
      { id: "x", order: 20 },
      { id: "x", order: 30 },
    ]);
  });

  test("does not mutate the input", () => {
    const ids = ["b", "a"];
    normalizedOrders(ids);
    expect(ids).toEqual(["b", "a"]);
  });
});
