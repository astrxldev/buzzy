import { describe, expect, mock, test } from "bun:test";
import {
  addSubmissionNote,
  calculatePrice,
  cancelSubmission,
  compactExpiredSubmissions,
  deleteSubmissionNote,
  isDuplicateSlipError,
  messages,
  type PaymentRepository,
  paySubmission,
  type RubgramActor,
  type RubgramConfig,
  registerSubmission,
  requireOwner,
  runAdminOperation,
  validateRegistration,
} from "./service";

const types = [
  { id: "abyss", price: 100 },
  { id: "theater", price: 80 },
];
const config: RubgramConfig = {
  locked: false,
  full: false,
  limit: 10,
  free: 0,
  allDiscount: 20,
  types,
};
const owner: RubgramActor = {
  userId: "user-1",
  isAdmin: mock(async () => false),
};
const anonymous = (): RubgramActor => ({
  isAdmin: mock(async () => false),
});
const admin = (): RubgramActor => ({
  isAdmin: mock(async () => true),
});

describe("Rubgram pricing", () => {
  test("sums selected service prices", () => {
    expect(calculatePrice(["abyss"], config)).toBe(100);
  });

  test("applies the all-services discount", () => {
    expect(calculatePrice(["abyss", "theater"], config)).toBe(160);
  });

  test("does not discount a partial or unknown selection", () => {
    expect(calculatePrice(["unknown"], config)).toBe(0);
  });

  test("makes any selection free while a free slot is advertised", () => {
    expect(calculatePrice(["abyss", "theater"], { ...config, free: 1 })).toBe(
      0,
    );
  });
});

describe("registration validation", () => {
  const valid = {
    name: "Buzz",
    server: "as",
    service: ["abyss"],
    user: "user-1",
  };

  test.each([
    [{ ...valid, name: "" }, messages.incomplete],
    [{ ...valid, server: "" }, messages.incomplete],
    [{ ...valid, service: [] }, messages.incomplete],
    [{ ...valid, user: undefined }, messages.incomplete],
    [{ ...valid, server: "mars" }, messages.invalidServer],
    [{ ...valid, service: ["fake"] }, messages.invalidService],
    [{ ...valid, name: "x".repeat(33) }, messages.nameTooLong],
  ])("rejects invalid registration %#", (input, expected) => {
    expect(validateRegistration(input, types)).toBe(expected);
  });

  test("accepts valid input at the name length boundary", () => {
    expect(
      validateRegistration({ ...valid, name: "x".repeat(32) }, types),
    ).toBe(undefined);
  });
});

describe("registration workflow", () => {
  const input = {
    name: "Buzz",
    server: "as",
    service: ["abyss"],
    user: "user-1",
  };

  function dependencies(
    overrides: Partial<Parameters<typeof registerSubmission>[1]> = {},
  ) {
    return {
      getConfig: mock(async () => config),
      removeExpired: mock(async () => {}),
      findDuplicate: mock(async () => undefined),
      insert: mock(async () => ({ id: "sub-1", queue: 4 })),
      consumeFreeSlot: mock(async () => {}),
      ...overrides,
    };
  }

  test("rejects a forged or absent form user before mutations", async () => {
    const deps = dependencies();
    expect(await registerSubmission({ ...input, user: undefined }, deps)).toBe(
      messages.incomplete,
    );
    expect(deps.removeExpired).not.toHaveBeenCalled();
    expect(deps.insert).not.toHaveBeenCalled();
  });

  test("stops at the registration lock", async () => {
    const deps = dependencies({
      getConfig: mock(async () => ({ ...config, locked: true })),
    });
    expect(await registerSubmission(input, deps)).toBe(messages.locked);
    expect(deps.removeExpired).not.toHaveBeenCalled();
  });

  test("compacts expirations before enforcing the refreshed limit", async () => {
    const getConfig = mock()
      .mockResolvedValueOnce({ ...config, full: true })
      .mockResolvedValueOnce(config);
    const deps = dependencies({ getConfig });
    expect(await registerSubmission(input, deps)).toEqual({
      id: "sub-1",
      queue: 4,
    });
    expect(deps.removeExpired).toHaveBeenCalledTimes(1);
  });

  test("rejects a genuinely full refreshed queue", async () => {
    const deps = dependencies({
      getConfig: mock(async () => ({ ...config, full: true, limit: 3 })),
    });
    expect(await registerSubmission(input, deps)).toBe(
      "คิวลงทะเบียนเต็มแล้ว (3 ครั้ง)",
    );
    expect(deps.findDuplicate).not.toHaveBeenCalled();
  });

  test("returns an existing unpaid queue instead of inserting", async () => {
    const duplicate = { id: "old", queue: 2 };
    const deps = dependencies({
      findDuplicate: mock(async () => duplicate),
    });
    expect(await registerSubmission(input, deps)).toEqual(duplicate);
    expect(deps.insert).not.toHaveBeenCalled();
  });

  test("inserts the authenticated user with the calculated price", async () => {
    const deps = dependencies();
    await registerSubmission(input, deps);
    expect(deps.insert).toHaveBeenCalledWith({
      ...input,
      price: 100,
    });
    expect(deps.consumeFreeSlot).not.toHaveBeenCalled();
  });

  test("consumes one slot only for a free registration", async () => {
    const deps = dependencies({
      getConfig: mock(async () => ({ ...config, free: 1 })),
    });
    await registerSubmission(input, deps);
    expect(deps.insert).toHaveBeenCalledWith(
      expect.objectContaining({ price: 0 }),
    );
    expect(deps.consumeFreeSlot).toHaveBeenCalledTimes(1);
  });
});

describe("ownership", () => {
  test("allows the owner without checking admin auth", async () => {
    await requireOwner(owner, "user-1");
    expect(owner.isAdmin).not.toHaveBeenCalled();
  });

  test("allows an admin to act on another user's submission", async () => {
    await expect(requireOwner(admin(), "user-1")).resolves.toBeUndefined();
  });

  test("rejects another user", async () => {
    await expect(requireOwner(anonymous(), "user-1")).rejects.toThrow(
      messages.unauthorized,
    );
  });
});

describe("payment workflow", () => {
  const active = {
    id: "sub-1",
    user: "user-1",
    service: ["abyss"],
    price: 100,
  };

  function setup(
    options: {
      active?: typeof active;
      expired?: {
        id: string;
        user: string;
        service: string[];
        name: string;
        server: "as";
      };
      insertSlip?: PaymentRepository["insertSlip"];
      slipResult?: Awaited<
        ReturnType<Parameters<typeof paySubmission>[2]["checkSlip"]>
      >;
    } = {},
  ) {
    const repository: PaymentRepository = {
      findSubmission: mock(async () => options.active),
      findExpired: mock(async () => options.expired),
      restoreExpired: mock(async () => {}),
      insertSlip: options.insertSlip ?? mock(async () => "slip-1"),
      markPaid: mock(async () => ({ id: "sub-1", queue: 8 })),
    };
    const checkSlip = mock(
      async () =>
        options.slipResult ?? {
          success: true as const,
          data: { transRef: "ref-1", amount: 100 },
        },
    );
    const dependencies = {
      transaction: async <T>(run: (repo: PaymentRepository) => Promise<T>) =>
        run(repository),
      calculatePrice: mock(async () => 160),
      checkSlip,
      isDuplicateSlipError,
    };
    return { repository, dependencies, checkSlip };
  }

  const input = {
    id: "sub-1",
    slip: Buffer.from(new ArrayBuffer(2)),
    type: "image/png",
  };

  test("returns not registered when active and expired records are absent", async () => {
    const { dependencies, checkSlip } = setup();
    expect(await paySubmission(input, owner, dependencies)).toBe(
      messages.notRegistered,
    );
    expect(checkSlip).not.toHaveBeenCalled();
  });

  test("requires ownership before checking a slip", async () => {
    const { dependencies, checkSlip } = setup({ active });
    await expect(
      paySubmission(input, anonymous(), dependencies),
    ).rejects.toThrow(messages.unauthorized);
    expect(checkSlip).not.toHaveBeenCalled();
  });

  test("checks and attaches a valid slip at the stored active price", async () => {
    const { repository, dependencies, checkSlip } = setup({ active });
    expect(await paySubmission(input, owner, dependencies)).toEqual({
      id: "sub-1",
      queue: 8,
    });
    expect(checkSlip).toHaveBeenCalledWith(input.slip, "image/png", 100);
    expect(repository.markPaid).toHaveBeenCalledWith("sub-1", "slip-1");
  });

  test("recalculates an expired price and uses it for slip validation", async () => {
    const expired = {
      id: "sub-1",
      user: "user-1",
      service: ["abyss", "theater"],
      name: "Buzz",
      server: "as" as const,
    };
    const { repository, dependencies, checkSlip } = setup({ expired });
    await paySubmission(input, owner, dependencies);
    expect(dependencies.calculatePrice).toHaveBeenCalledWith(expired.service);
    expect(repository.restoreExpired).toHaveBeenCalledWith(expired, 160);
    expect(checkSlip).toHaveBeenCalledWith(input.slip, "image/png", 160);
  });

  test("returns processor failures without inserting a slip", async () => {
    const { repository, dependencies } = setup({
      active,
      slipResult: { success: false, code: 422, message: "bad slip" },
    });
    expect(await paySubmission(input, owner, dependencies)).toBe(
      "422: bad slip",
    );
    expect(repository.insertSlip).not.toHaveBeenCalled();
  });

  test("maps only a duplicate reference violation to duplicate slip", async () => {
    const error = { code: "23505", constraint: "slips_ref_unique" };
    const { dependencies } = setup({
      active,
      insertSlip: mock(async () => {
        throw error;
      }),
    });
    expect(await paySubmission(input, owner, dependencies)).toBe(
      messages.duplicateSlip,
    );
  });

  test("propagates unrelated database failures", async () => {
    const error = Object.assign(new Error("connection lost"), {
      code: "08006",
    });
    const { dependencies } = setup({
      active,
      insertSlip: mock(async () => {
        throw error;
      }),
    });
    await expect(paySubmission(input, owner, dependencies)).rejects.toBe(error);
  });
});

describe("expiration compaction", () => {
  test("archives, removes, and compacts expired queues in descending order", async () => {
    const calls: Array<string | number> = [];
    const expired = [
      { id: "one", queue: 2 },
      { id: "two", queue: 5 },
    ];
    const result = await compactExpiredSubmissions(
      {
        findExpired: mock(async () => expired),
        archive: mock(async (rows) => {
          calls.push(`archive:${rows.length}`);
        }),
        remove: mock(async (ids) => {
          calls.push(`remove:${ids.join(",")}`);
        }),
        shiftAfter: mock(async (queue) => {
          calls.push(queue);
        }),
        getMaxQueue: mock(async () => 7),
        setNextQueue: mock(async (next) => {
          calls.push(`next:${next}`);
        }),
      },
      new Date("2026-01-01"),
    );
    expect(result).toEqual({ removed: 2 });
    expect(calls).toEqual(["archive:2", "remove:one,two", 5, 2, "next:8"]);
  });

  test("skips archive/delete/shift and resets an empty sequence to one", async () => {
    const archive = mock(async () => {});
    const remove = mock(async () => {});
    const shiftAfter = mock(async () => {});
    const setNextQueue = mock(async () => {});
    expect(
      await compactExpiredSubmissions({
        findExpired: mock(async () => []),
        archive,
        remove,
        shiftAfter,
        getMaxQueue: mock(async () => null),
        setNextQueue,
      }),
    ).toEqual({ removed: 0 });
    expect(archive).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(shiftAfter).not.toHaveBeenCalled();
    expect(setNextQueue).toHaveBeenCalledWith(1);
  });
});

describe("cancellation", () => {
  test("allows the owner to soft-delete", async () => {
    const cancel = mock(async () => {});
    expect(
      await cancelSubmission("sub-1", owner, {
        findSubmission: mock(async () => ({ user: "user-1" })),
        cancel,
      }),
    ).toBeTrue();
    expect(cancel).toHaveBeenCalledWith("sub-1");
  });

  test("allows admin cancellation", async () => {
    const cancel = mock(async () => {});
    await cancelSubmission("sub-1", admin(), {
      findSubmission: mock(async () => ({ user: "someone" })),
      cancel,
    });
    expect(cancel).toHaveBeenCalled();
  });

  test("does not mutate missing or unauthorized submissions", async () => {
    const cancel = mock(async () => {});
    expect(
      await cancelSubmission("missing", anonymous(), {
        findSubmission: mock(async () => undefined),
        cancel,
      }),
    ).toBeFalse();
    await expect(
      cancelSubmission("sub-1", anonymous(), {
        findSubmission: mock(async () => ({ user: "someone" })),
        cancel,
      }),
    ).rejects.toThrow(messages.unauthorized);
    expect(cancel).not.toHaveBeenCalled();
  });
});

describe("notes and admin operations", () => {
  const notes = [
    { id: "old", text: "old note", createdAt: "2025-01-01T00:00:00.000Z" },
  ];

  test("admin note creation appends deterministic metadata", async () => {
    const saveNotes = mock(async () => {});
    const note = await addSubmissionNote("sub-1", "new note", admin(), {
      getNotes: mock(async () => notes),
      saveNotes,
      createId: () => "new",
      now: () => new Date("2026-02-03T04:05:06.000Z"),
    });
    expect(note).toEqual({
      id: "new",
      text: "new note",
      createdAt: "2026-02-03T04:05:06.000Z",
    });
    expect(saveNotes).toHaveBeenCalledWith("sub-1", [...notes, note]);
  });

  test("admin note deletion preserves all other notes", async () => {
    const saveNotes = mock(async () => {});
    await deleteSubmissionNote("sub-1", "old", admin(), {
      getNotes: mock(async () => [
        ...notes,
        { id: "keep", text: "keep", createdAt: "now" },
      ]),
      saveNotes,
    });
    expect(saveNotes).toHaveBeenCalledWith("sub-1", [
      { id: "keep", text: "keep", createdAt: "now" },
    ]);
  });

  test("non-admins cannot change notes", async () => {
    const saveNotes = mock(async () => {});
    await expect(
      addSubmissionNote("sub-1", "no", anonymous(), {
        getNotes: mock(async () => notes),
        saveNotes,
        createId: () => "new",
        now: () => new Date(),
      }),
    ).rejects.toThrow(messages.unauthorized);
    expect(saveNotes).not.toHaveBeenCalled();
  });

  test("admin operation runs once and returns its result", async () => {
    const operation = mock(async () => "updated");
    expect(await runAdminOperation(admin(), operation)).toBe("updated");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test("unauthorized admin operation never invokes its dependency", async () => {
    const operation = mock(async () => "updated");
    await expect(runAdminOperation(anonymous(), operation)).rejects.toThrow(
      messages.unauthorized,
    );
    expect(operation).not.toHaveBeenCalled();
  });
});

describe("duplicate slip classification", () => {
  test("recognizes direct and wrapped slip-reference unique violations", () => {
    const duplicate = { code: "23505", constraint: "slips_ref_unique" };
    expect(isDuplicateSlipError(duplicate)).toBeTrue();
    expect(isDuplicateSlipError({ cause: duplicate })).toBeTrue();
  });

  test("rejects other constraints and database errors", () => {
    expect(
      isDuplicateSlipError({ code: "23505", constraint: "users_email_unique" }),
    ).toBeFalse();
    expect(isDuplicateSlipError({ code: "23505" })).toBeFalse();
    expect(isDuplicateSlipError({ code: "08006" })).toBeFalse();
    expect(isDuplicateSlipError(new Error("boom"))).toBeFalse();
  });
});
