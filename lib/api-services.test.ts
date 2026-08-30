import { describe, expect, mock, test } from "bun:test";
import {
  type ArtifactServiceDependencies,
  cdnifyService,
  checkCdnRefsService,
  deleteCdnService,
  getAmberVhService,
  setArtifactLimitService,
  setTierlistPlacementsService,
  setTierlistStateService,
  submitArtifactService,
  type TierlistStateDependencies,
} from "./api-services";

const validArtifact = {
  name: "Traveler",
  uid: "123456789",
  character: "Furina",
  comment: "Please review",
};

function artifactDeps(
  overrides: Partial<ArtifactServiceDependencies> = {},
): ArtifactServiceDependencies {
  return {
    getConfig: async () => ({ locked: false, limit: -1 }),
    countQueued: async () => 0,
    uidExists: async () => false,
    characterExists: async () => true,
    insert: async () => ({ id: "new", queue: 1 }),
    replace: async () => ({ id: "existing", queue: 1 }),
    createEditToken: () => "next-token",
    afterSubmit: async () => {},
    ...overrides,
  };
}

describe("submitArtifactService", () => {
  test("returns immediately while submissions are locked", async () => {
    const countQueued = mock(async () => 0);
    const result = await submitArtifactService(
      validArtifact,
      undefined,
      artifactDeps({
        getConfig: async () => ({ locked: true, limit: -1 }),
        countQueued,
      }),
    );

    expect(result).toContain("ปิดรับลงทะเบียน");
    expect(countQueued).not.toHaveBeenCalled();
  });

  test("enforces zero and reached queue limits before validation", async () => {
    const uidExists = mock(async () => false);
    const result = await submitArtifactService(
      validArtifact,
      undefined,
      artifactDeps({
        getConfig: async () => ({ locked: false, limit: 2 }),
        countQueued: async () => 2,
        uidExists,
      }),
    );

    expect(result).toBe("คิวลงทะเบียนเต็มแล้ว (2 ครั้ง)");
    expect(uidExists).not.toHaveBeenCalled();
  });

  test("treats -1 as unlimited", async () => {
    expect(
      await submitArtifactService(
        validArtifact,
        undefined,
        artifactDeps({
          getConfig: async () => ({ locked: false, limit: -1 }),
          countQueued: async () => 100,
        }),
      ),
    ).toEqual({ id: "new", queue: 1 });
  });

  test("reports missing and invalid form fields without querying records", async () => {
    const uidExists = mock(async () => false);
    const deps = artifactDeps({ uidExists });

    expect(
      await submitArtifactService(
        { name: "Name", uid: "bad" },
        undefined,
        deps,
      ),
    ).toContain("UID ไม่ถูกต้อง");
    expect(uidExists).not.toHaveBeenCalled();
  });

  test("enforces name and comment length limits", async () => {
    const deps = artifactDeps();
    const longName = await submitArtifactService(
      { ...validArtifact, name: "x".repeat(65) },
      undefined,
      deps,
    );
    const longComment = await submitArtifactService(
      { ...validArtifact, comment: "x".repeat(1025) },
      undefined,
      deps,
    );

    expect(longName).toContain("64");
    expect(longComment).toContain("1024");
  });

  test("rejects a duplicate UID before checking the character", async () => {
    const characterExists = mock(async () => true);
    const result = await submitArtifactService(
      validArtifact,
      undefined,
      artifactDeps({ uidExists: async () => true, characterExists }),
    );

    expect(result).toBe("คุณลงทะเบียนไปแล้ว");
    expect(characterExists).not.toHaveBeenCalled();
  });

  test("rejects an unknown character before insertion", async () => {
    const insert = mock(async () => ({ id: "new", queue: 1 }));
    const result = await submitArtifactService(
      validArtifact,
      undefined,
      artifactDeps({ characterExists: async () => false, insert }),
    );

    expect(result).toBe("ไม่พบตัวละครที่เลือก");
    expect(insert).not.toHaveBeenCalled();
  });

  test("inserts validated data and runs submit side effects afterward", async () => {
    const calls: string[] = [];
    const result = await submitArtifactService(
      validArtifact,
      undefined,
      artifactDeps({
        insert: async (data) => {
          expect(data).toEqual(validArtifact);
          calls.push("insert");
          return { id: "created", queue: 4 };
        },
        afterSubmit: async () => {
          calls.push("after");
        },
      }),
    );

    expect(result).toEqual({ id: "created", queue: 4 });
    expect(calls).toEqual(["insert", "after"]);
  });

  test("allows an edit when the queue is full and excludes its token from UID checks", async () => {
    const countQueued = mock(async () => 10);
    let excludedToken: string | undefined;
    let replacementToken: string | undefined;
    const edit = { sub: "submission", token: "current-token" };
    const result = await submitArtifactService(
      validArtifact,
      edit,
      artifactDeps({
        getConfig: async () => ({ locked: false, limit: 1 }),
        countQueued,
        uidExists: async (_uid, excluded) => {
          excludedToken = excluded;
          return false;
        },
        replace: async (receivedEdit, data, token) => {
          expect(receivedEdit).toEqual(edit);
          expect(data).toEqual(validArtifact);
          replacementToken = token;
          return { id: "submission", queue: 1 };
        },
      }),
    );

    expect(result).toEqual({ id: "submission", queue: 1 });
    expect(countQueued).not.toHaveBeenCalled();
    expect(excludedToken).toBe("current-token");
    expect(replacementToken).toBe("next-token");
  });

  test("does not run side effects when an edit is no longer eligible", async () => {
    const afterSubmit = mock(async () => {});
    const result = await submitArtifactService(
      validArtifact,
      { sub: "submission", token: "token" },
      artifactDeps({ replace: async () => undefined, afterSubmit }),
    );

    expect(result).toBe("คิวนี้แก้ไม่ได้แล้ว");
    expect(afterSubmit).not.toHaveBeenCalled();
  });

  test("propagates replacement failure and never reports success", async () => {
    const failure = new Error("transaction rolled back");
    const afterSubmit = mock(async () => {});
    expect(
      submitArtifactService(
        validArtifact,
        { sub: "submission", token: "token" },
        artifactDeps({
          replace: async () => {
            throw failure;
          },
          afterSubmit,
        }),
      ),
    ).rejects.toBe(failure);
    expect(afterSubmit).not.toHaveBeenCalled();
  });
});

describe("setArtifactLimitService", () => {
  test("checks admin access before validation or persistence", async () => {
    const persist = mock(async () => {});
    expect(
      setArtifactLimitService(Number.NaN, {
        adminCheck: async () => null,
        persist,
        afterSet: async () => {},
      }),
    ).rejects.toBe("Unauthorized");
    expect(persist).not.toHaveBeenCalled();
  });

  test.each([
    Number.NaN,
    Infinity,
    -Infinity,
    -2,
    1.5,
  ])("rejects invalid limit %p without side effects", async (limit) => {
    const persist = mock(async () => {});
    const afterSet = mock(async () => {});
    expect(
      setArtifactLimitService(limit, {
        adminCheck: async () => true,
        persist,
        afterSet,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(persist).not.toHaveBeenCalled();
    expect(afterSet).not.toHaveBeenCalled();
  });

  test.each([
    -1, 0, 12,
  ])("persists valid limit %p before side effects", async (limit) => {
    const calls: string[] = [];
    await setArtifactLimitService(limit, {
      adminCheck: async () => true,
      persist: async (value) => {
        calls.push(`persist:${value}`);
      },
      afterSet: async (value) => {
        calls.push(`after:${value}`);
      },
    });
    expect(calls).toEqual([`persist:${limit}`, `after:${limit}`]);
  });
});

function tierStateDeps(
  overrides: Partial<TierlistStateDependencies> = {},
): TierlistStateDependencies {
  return {
    adminCheck: async () => true,
    find: async () => undefined,
    update: async () => {},
    insert: async () => {},
    getStates: async () => [],
    afterSet: async () => {},
    ...overrides,
  };
}

describe("setTierlistStateService", () => {
  test("blocks anonymous mutations before lookup", async () => {
    const find = mock(async () => undefined);
    expect(
      setTierlistStateService(
        { uuid: "state" },
        tierStateDeps({ adminCheck: async () => null, find }),
      ),
    ).rejects.toBe("Unauthorized");
    expect(find).not.toHaveBeenCalled();
  });

  test.each([
    {},
    { ref: "tile" },
    { list: "list" },
    { ref: "tile", list: "" },
  ])("rejects incomplete identifiers %#", async (data) => {
    const find = mock(async () => undefined);
    expect(
      setTierlistStateService(data, tierStateDeps({ find })),
    ).rejects.toThrow();
    expect(find).not.toHaveBeenCalled();
  });

  test("updates by UUID and resolves the existing list for side effects", async () => {
    const calls: string[] = [];
    await setTierlistStateService(
      { uuid: "state", comment: "updated" },
      tierStateDeps({
        find: async (identifier) => {
          expect(identifier).toEqual({ uuid: "state" });
          return {
            uuid: "state",
            char: "char",
            ref: "tile",
            list: "list",
            comment: "old",
            badges: [],
          };
        },
        update: async (uuid, data) => {
          calls.push(`update:${uuid}:${data.comment}`);
        },
        getStates: async (list) => {
          calls.push(`states:${list}`);
          return [];
        },
        afterSet: async (list) => {
          calls.push(`after:${list}`);
        },
      }),
    );

    expect(calls).toEqual([
      "update:state:updated",
      "states:list",
      "after:list",
    ]);
  });

  test("finds by ref/list and inserts a complete new state without requiring UUID", async () => {
    let inserted: unknown;
    await setTierlistStateService(
      { char: "char", ref: "tile", list: "list", badges: ["badge"] },
      tierStateDeps({
        find: async (identifier) => {
          expect(identifier).toEqual({ ref: "tile", list: "list" });
          return undefined;
        },
        insert: async (data) => {
          inserted = data;
        },
      }),
    );
    expect(inserted).toEqual({
      char: "char",
      ref: "tile",
      list: "list",
      badges: ["badge"],
    });
  });

  test("rejects incomplete inserts and more than four badges", async () => {
    const insert = mock(async () => {});
    expect(
      setTierlistStateService(
        { ref: "tile", list: "list" },
        tierStateDeps({ insert }),
      ),
    ).rejects.toThrow();
    expect(
      setTierlistStateService(
        {
          char: "char",
          ref: "tile",
          list: "list",
          badges: ["1", "2", "3", "4", "5"],
        },
        tierStateDeps({ insert }),
      ),
    ).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("setTierlistPlacementsService", () => {
  test("requires admin before validating or persisting", async () => {
    const persist = mock(async () => {});
    expect(
      setTierlistPlacementsService(
        "",
        {},
        {
          adminCheck: async () => null,
          persist,
          afterSet: async () => {},
        },
      ),
    ).rejects.toBe("Unauthorized");
    expect(persist).not.toHaveBeenCalled();
  });

  test("rejects empty list, placement, and character identifiers", async () => {
    const deps = {
      adminCheck: async () => true,
      persist: mock(async () => {}),
      afterSet: mock(async () => {}),
    };
    expect(setTierlistPlacementsService("", {}, deps)).rejects.toThrow();
    expect(
      setTierlistPlacementsService("list", { "": ["char"] }, deps),
    ).rejects.toThrow();
    expect(
      setTierlistPlacementsService("list", { tier: [""] }, deps),
    ).rejects.toThrow();
    expect(deps.persist).not.toHaveBeenCalled();
  });

  test("does not persist untiered but publishes the complete placement state", async () => {
    let persisted: unknown;
    let published: unknown;
    const placements = { untiered: ["char-1"], S: ["char-2"] };
    await setTierlistPlacementsService("list", placements, {
      adminCheck: async () => true,
      persist: async (_list, value) => {
        persisted = value;
      },
      afterSet: async (_list, value) => {
        published = value;
      },
    });
    expect(persisted).toEqual({ S: ["char-2"] });
    expect(published).toEqual(placements);
  });
});

describe("CDN services", () => {
  test("formats and flattens references for one or many IDs", async () => {
    const findRefs = async (id: string) =>
      id === "a"
        ? [
            { table: "characters", id: "c1" },
            { table: "guides", id: "g1" },
          ]
        : [{ table: "tierlist", id: "t1" }];
    expect(await checkCdnRefsService("a", findRefs)).toEqual([
      "a=>characters#c1",
      "a=>guides#g1",
    ]);
    expect(await checkCdnRefsService(["a", "b"], findRefs)).toEqual([
      "a=>characters#c1",
      "a=>guides#g1",
      "b=>tierlist#t1",
    ]);
  });

  test.each([
    false,
    true,
  ])("requires admin before normal or force deletion (force=%p)", async (force) => {
    const deleteMany = mock(async () => {});
    let transactionCalls = 0;
    const transaction = async <T>(callback: (tx: object) => Promise<T>) => {
      transactionCalls++;
      return callback({});
    };
    expect(
      deleteCdnService(["a"], force, {
        adminCheck: async () => null,
        transaction,
        findRefs: async () => [],
        deleteOne: async () => {},
        deleteMany,
        afterDelete: async () => {},
      }),
    ).rejects.toBe("Unauthorized");
    expect(deleteMany).not.toHaveBeenCalled();
    expect(transactionCalls).toBe(0);
  });

  test("deletes unreferenced files in order and records completion", async () => {
    const calls: string[] = [];
    const result = await deleteCdnService(["a", "b"], false, {
      adminCheck: async () => true,
      transaction: async (callback) => callback({ transaction: true }),
      findRefs: async (id) => {
        calls.push(`refs:${id}`);
        return [];
      },
      deleteOne: async (id) => {
        calls.push(`delete:${id}`);
      },
      deleteMany: async () => {},
      afterDelete: async (count, ids, incomplete) => {
        calls.push(`after:${count}:${ids.join(",")}:${incomplete}`);
      },
    });
    expect(result).toBeUndefined();
    expect(calls).toEqual([
      "refs:a",
      "delete:a",
      "refs:b",
      "delete:b",
      "after:2:a,b:false",
    ]);
  });

  test("stops at the first referenced file and reports partial deletion", async () => {
    const deleted: string[] = [];
    let after: unknown;
    const result = await deleteCdnService(["a", "b", "c"], false, {
      adminCheck: async () => true,
      transaction: async (callback) => callback({}),
      findRefs: async (id) =>
        id === "b" ? [{ table: "characters", id: "char" }] : [],
      deleteOne: async (id) => {
        deleted.push(id);
      },
      deleteMany: async () => {},
      afterDelete: async (...args) => {
        after = args;
      },
    });
    expect(deleted).toEqual(["a"]);
    expect(result).toEqual({
      id: "b",
      refs: ["b=>characters#char"],
    });
    expect(after).toEqual([1, ["a", "b", "c"], true]);
  });

  test("force deletion skips reference checks but still runs side effects", async () => {
    const findRefs = mock(async () => []);
    const calls: unknown[] = [];
    await deleteCdnService(["a", "b"], true, {
      adminCheck: async () => true,
      transaction: async (callback) => callback({}),
      findRefs,
      deleteOne: async () => {},
      deleteMany: async (ids) => {
        calls.push(["delete", ids]);
      },
      afterDelete: async (...args) => {
        calls.push(["after", ...args]);
      },
    });
    expect(findRefs).not.toHaveBeenCalled();
    expect(calls).toEqual([
      ["delete", ["a", "b"]],
      ["after", 2, ["a", "b"], false],
    ]);
  });

  test("cdnify stores exact metadata and bytes before logging", async () => {
    const calls: string[] = [];
    const file = new File([new Uint8Array([1, 2, 3])], "image.png", {
      type: "image/png",
    });
    const id = await cdnifyService(file, file.name, {
      insert: async (data) => {
        expect(data.name).toBe("image.png");
        expect(data.size).toBe("3");
        expect(data.type).toBe("image/png");
        expect([...data.data]).toEqual([1, 2, 3]);
        calls.push("insert");
        return "cdn-id";
      },
      afterUpload: async (assetId, name, size) => {
        calls.push(`after:${assetId}:${name}:${size}`);
      },
    });
    expect(id).toBe("cdn-id");
    expect(calls).toEqual(["insert", "after:cdn-id:image.png:3"]);
  });

  test("cdnify does not log a failed insert", async () => {
    const afterUpload = mock(async () => {});
    const failure = new Error("insert failed");
    expect(
      cdnifyService(new Blob(["x"]), null, {
        insert: async () => {
          throw failure;
        },
        afterUpload,
      }),
    ).rejects.toBe(failure);
    expect(afterUpload).not.toHaveBeenCalled();
  });
});

describe("getAmberVhService", () => {
  test("returns a cached hash without fetching", async () => {
    const fetchVersion = mock(async () => ({}));
    expect(
      await getAmberVhService({
        getCached: async () => "cached-vh",
        fetchVersion,
        setCached: async () => {},
      }),
    ).toBe("cached-vh");
    expect(fetchVersion).not.toHaveBeenCalled();
  });

  test("falls back to the API after a cache read failure and schedules caching", async () => {
    const scheduled: (() => void)[] = [];
    const cached: string[] = [];
    const result = await getAmberVhService({
      getCached: async () => {
        throw new Error("redis unavailable");
      },
      fetchVersion: async () => ({ response: 1, data: { vh: "fresh-vh" } }),
      setCached: async (value) => {
        cached.push(value);
      },
      schedule: (callback) => scheduled.push(callback),
    });
    expect(result).toBe("fresh-vh");
    expect(cached).toEqual([]);
    expect(scheduled).toHaveLength(1);
    scheduled[0]();
    await Promise.resolve();
    expect(cached).toEqual(["fresh-vh"]);
  });

  test.each([
    {},
    { response: 0, data: { vh: "hash" } },
    { response: 1, data: { vh: "hash-that-is-too-long" } },
    { response: 1, data: {} },
  ])("rejects malformed API payload %#", async (payload) => {
    expect(
      getAmberVhService({
        getCached: async () => null,
        fetchVersion: async () => payload,
        setCached: async () => {},
      }),
    ).rejects.toThrow();
  });

  test("ignores asynchronous cache write failures", async () => {
    const scheduled: (() => void)[] = [];
    expect(
      await getAmberVhService({
        getCached: async () => null,
        fetchVersion: async () => ({ response: 1, data: { vh: "hash" } }),
        setCached: async () => {
          throw new Error("redis write failed");
        },
        schedule: (callback) => scheduled.push(callback),
      }),
    ).toBe("hash");
    scheduled[0]();
    await Promise.resolve();
  });
});
