import { describe, expect, spyOn, test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { tierlistStates } from "./db/schema";
import {
  finishTierlistWrite,
  lockTierlistList,
  normalizeTierlistPlacements,
  resolveTierlistStateTarget,
  validateTierlistStateInput,
} from "./tierlist-write";

type StateRow = typeof tierlistStates.$inferSelect;

const stateRow = (uuid: string, list: string, ref = "char-1") =>
  ({ uuid, list, ref }) as StateRow;

describe("tierlist write consistency helpers", () => {
  test("validates list, ref, and optional UUID before writing", () => {
    expect(
      validateTierlistStateInput({
        list: "v1",
        ref: "char-1",
        uuid: undefined,
      }),
    ).toEqual({ list: "v1", ref: "char-1" });
    expect(() =>
      validateTierlistStateInput({ list: "", ref: "char-1" }),
    ).toThrow();
    expect(() => validateTierlistStateInput({ list: "v1", ref: "" })).toThrow();
    expect(() =>
      validateTierlistStateInput({ list: "v1", ref: "char-1", uuid: "bad" }),
    ).toThrow();
  });

  test("rejects cross-list UUIDs and canonicalizes duplicate refs", () => {
    const uuidMatch = stateRow("uuid-1", "v1");
    const canonicalRefMatch = stateRow("uuid-0", "v1");
    expect(() =>
      resolveTierlistStateTarget(stateRow("uuid-2", "v2"), uuidMatch, "v1"),
    ).toThrow("belongs to another version");
    expect(resolveTierlistStateTarget(uuidMatch, undefined, "v1")).toBe(
      uuidMatch,
    );
    expect(resolveTierlistStateTarget(uuidMatch, canonicalRefMatch, "v1")).toBe(
      canonicalRefMatch,
    );
    expect(resolveTierlistStateTarget(undefined, uuidMatch, "v1")).toBe(
      uuidMatch,
    );
  });

  test("uses one transaction-scoped advisory lock per list before mutations", async () => {
    const order: string[] = [];
    const queries: unknown[] = [];
    await lockTierlistList(
      {
        execute: async (query) => {
          order.push("lock");
          queries.push(query);
        },
      },
      "v1",
    );
    order.push("write");
    const compiled = new PgDialect().sqlToQuery(queries[0] as never);
    expect(compiled.sql).toContain("pg_advisory_xact_lock");
    expect(compiled.sql).toContain("hashtextextended");
    expect(compiled.params).toContain("v1");
    expect(order).toEqual(["lock", "write"]);
  });

  test("normalizes placements without mutating the caller's untiered data", () => {
    const placements = { S: ["a"], untiered: ["b"] };
    expect(normalizeTierlistPlacements(placements)).toEqual({ S: ["a"] });
    expect(placements).toEqual({ S: ["a"], untiered: ["b"] });
  });

  test("returns persisted success when publication fails after commit", async () => {
    const errorLog = spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await finishTierlistWrite({
        list: "v1",
        operation: "state",
        data: [{ uuid: "state-1" }],
        audit: async () => {},
        revalidate: () => {},
        publish: async () => {
          throw new Error("redis unavailable");
        },
      });
      expect(result).toEqual({
        persisted: true,
        data: [{ uuid: "state-1" }],
        publication: "failed",
      });
      expect(errorLog).toHaveBeenCalledTimes(1);
    } finally {
      errorLog.mockRestore();
    }
  });

  test("reports sent when post-commit publication succeeds", async () => {
    const result = await finishTierlistWrite({
      list: "v1",
      operation: "placements",
      data: { S: ["char-1"] },
      audit: async () => {},
      revalidate: () => {},
      publish: async () => 1,
    });
    expect(result).toEqual({
      persisted: true,
      data: { S: ["char-1"] },
      publication: "sent",
    });
  });

  test("does not turn a precommit transaction failure into persisted success", async () => {
    const failure = new Error("transaction failed");
    await expect(
      lockTierlistList({ execute: async () => Promise.reject(failure) }, "v1"),
    ).rejects.toBe(failure);
  });
});
