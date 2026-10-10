import { describe, expect, it } from "bun:test";
import { TierlistSaveQueue } from "./tierlist-save-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe("TierlistSaveQueue", () => {
  it("serializes writes and persists the latest coalesced value", async () => {
    const writes: string[] = [];
    const first = deferred<string>();
    const second = deferred<string>();
    const queue = new TierlistSaveQueue<string, string>(
      (value) => {
        writes.push(value);
        return writes.length === 1 ? first.promise : second.promise;
      },
      () => {},
    );
    const a = queue.enqueue("a");
    const b = queue.enqueue("b");
    const c = queue.enqueue("c");
    await flushMicrotasks();
    expect(writes).toEqual(["a"]);
    first.resolve("saved a");
    await flushMicrotasks();
    expect(writes).toEqual(["a", "c"]);
    second.resolve("saved c");
    await expect(Promise.all([a, b, c])).resolves.toEqual([
      "saved a",
      "saved c",
      "saved c",
    ]);
  });

  it("retains failed intent for explicit retry", async () => {
    const writes: string[] = [];
    const retry = deferred<string>();
    const queue = new TierlistSaveQueue<string, string>(
      (value) => {
        writes.push(value);
        if (writes.length === 1) return Promise.reject(new Error("offline"));
        return retry.promise;
      },
      () => {},
    );
    await expect(queue.enqueue("latest")).rejects.toThrow("offline");
    const retried = queue.retry();
    await flushMicrotasks();
    expect(writes).toEqual(["latest", "latest"]);
    retry.resolve("saved");
    await expect(retried).resolves.toBe("saved");
  });

  it("continues with a newer queued value after an older write fails", async () => {
    const writes: string[] = [];
    const latest = deferred<string>();
    const queue = new TierlistSaveQueue<string, string>(
      (value) => {
        writes.push(value);
        return writes.length === 1
          ? Promise.reject(new Error("offline"))
          : latest.promise;
      },
      () => {},
    );
    const oldIntent = queue.enqueue("old");
    const latestIntent = queue.enqueue("latest");
    await flushMicrotasks();
    await expect(oldIntent).rejects.toThrow("offline");
    await flushMicrotasks();
    expect(writes).toEqual(["old", "latest"]);
    latest.resolve("saved latest");
    await expect(latestIntent).resolves.toBe("saved latest");
  });
});
