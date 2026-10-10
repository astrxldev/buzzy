import { describe, expect, it } from "bun:test";
import {
  reconcileCanonicalStates,
  reconcileScopedStateWrite,
  TierlistCanonicalFetch,
} from "./tierlist-canonical-fetch";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe("TierlistCanonicalFetch", () => {
  it("fetches the switched-to version while ignoring the older response", async () => {
    const coordinator = new TierlistCanonicalFetch<string>();
    const old = deferred<string>();
    const newVersion = deferred<string>();
    const applied: string[] = [];
    coordinator.setVersion("A");
    coordinator.fetch(
      "A",
      () => old.promise,
      (value) => applied.push(value),
      () => {},
    );
    coordinator.setVersion("B");
    coordinator.fetch(
      "B",
      () => newVersion.promise,
      (value) => applied.push(value),
      () => {},
    );
    old.resolve("A");
    await flush();
    expect(applied).toEqual([]);
    newVersion.resolve("B");
    await flush();
    expect(applied).toEqual(["B"]);
  });

  it("refetches after an SSE invalidation during the initial fetch", async () => {
    const coordinator = new TierlistCanonicalFetch<string>();
    const first = deferred<string>();
    const applied: string[] = [];
    let fetchCount = 0;
    coordinator.setVersion("A");
    const load = () =>
      ++fetchCount === 1 ? first.promise : Promise.resolve("latest");
    const fetch = () =>
      coordinator.fetch(
        "A",
        load,
        (value) => applied.push(value),
        () => {},
      );
    fetch();
    fetch();
    first.resolve("stale");
    await flush();
    expect(fetchCount).toBe(2);
    expect(applied).toEqual(["latest"]);
  });

  it("does not start a replacement after disposal", async () => {
    const coordinator = new TierlistCanonicalFetch<string>();
    const first = deferred<string>();
    let fetchCount = 0;
    coordinator.setVersion("A");
    const load = () =>
      ++fetchCount === 1 ? first.promise : Promise.resolve("next");
    coordinator.fetch(
      "A",
      load,
      () => {},
      () => {},
    );
    coordinator.fetch(
      "A",
      load,
      () => {},
      () => {},
    );
    coordinator.dispose();
    first.resolve("stale");
    await flush();
    expect(fetchCount).toBe(1);
  });

  it("preserves a local edit made during a fetch while reconciling other refs", () => {
    const merged = reconcileCanonicalStates(
      [
        { ref: "one", value: "stale server value" },
        { ref: "two", value: "fresh server value" },
      ],
      [
        { ref: "one", value: "local edit" },
        { ref: "two", value: "old local value" },
      ],
      new Set(["one"]),
    );
    expect(merged).toEqual([
      { ref: "two", value: "fresh server value" },
      { ref: "one", value: "local edit" },
    ]);
  });

  it("scopes out-of-order server write responses to their own ref", () => {
    let states = [
      { ref: "one", value: "newer one" },
      { ref: "two", value: "newer two" },
    ];
    states = reconcileScopedStateWrite(states, "two", [
      { ref: "one", value: "stale one" },
      { ref: "two", value: "saved two" },
    ]);
    states = reconcileScopedStateWrite(states, "one", [
      { ref: "one", value: "saved one" },
      { ref: "two", value: "stale two" },
    ]);
    expect(states).toEqual([
      { ref: "two", value: "saved two" },
      { ref: "one", value: "saved one" },
    ]);
  });
});
