import { describe, expect, mock, test } from "bun:test";
import { registerAbortCleanup } from "./abort";

describe("abort cleanup", () => {
  test("runs once when a signal aborts", () => {
    const controller = new AbortController();
    const cleanup = mock(() => {});
    registerAbortCleanup(controller.signal, cleanup);
    controller.abort();
    controller.abort();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test("runs immediately for an already-aborted health request", () => {
    const controller = new AbortController();
    controller.abort();
    const cleanup = mock(() => {});
    const remove = registerAbortCleanup(controller.signal, cleanup);
    expect(cleanup).toHaveBeenCalledTimes(1);
    remove();
  });

  test("returns a harmless cleanup without a signal", () => {
    const cleanup = mock(() => {});
    const remove = registerAbortCleanup(undefined, cleanup);
    remove();
    expect(cleanup).not.toHaveBeenCalled();
  });

  test("returned cleanup removes the abort listener", () => {
    const controller = new AbortController();
    const cleanup = mock(() => {});
    const remove = registerAbortCleanup(controller.signal, cleanup);
    remove();
    controller.abort();
    expect(cleanup).not.toHaveBeenCalled();
  });
});
