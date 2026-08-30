export type RubgramActor = {
  userId?: string;
  isAdmin: () => Promise<boolean>;
};

export type RubgramType = {
  id: string;
  price: number;
};

export type RubgramConfig = {
  locked: boolean;
  full: boolean;
  limit: number;
  free: number;
  allDiscount: number;
  types: RubgramType[];
};

export type RegistrationInput = {
  name: string;
  server: string;
  service: string[];
  user?: string;
};

export type QueueResult = { id: string; queue: number };

export type Submission = {
  id: string;
  user: string;
  service: string[];
  price: number;
};

export type ExpiredSubmission = Omit<Submission, "price"> & {
  name: string;
  server: "as" | "eu" | "us" | "tw";
};

export type Note = {
  id: string;
  text: string;
  createdAt: string;
};

export const messages = {
  incomplete: "กรุณากรอกข้อมูลให้ครบถ้วน",
  invalidServer: "เซิร์ฟไม่ถูกต้อง",
  invalidService: "บริการไม่ถูกต้อง",
  nameTooLong: "ชื่อยาวเกินไป ต้องไม่เกิน 32 ตัวอักษร",
  locked: "ปิดรับลงทะเบียนชั่วคราว เนื่องจากมีผู้ลงจำนวนมาก",
  notRegistered: "คุณยังไม่ได้ลงทะเบียน",
  duplicateSlip: "สลิปนี้ถูกใช้ไปแล้ว",
  unauthorized: "Unauthorized",
} as const;

export function calculatePrice(
  service: string[],
  config: Pick<RubgramConfig, "free" | "types" | "allDiscount">,
) {
  if (config.free > 0) return 0;
  const total = service.reduce(
    (price, id) =>
      price + (config.types.find((type) => type.id === id)?.price ?? 0),
    0,
  );
  return (
    total -
    (config.types.every((type) => service.includes(type.id))
      ? config.allDiscount
      : 0)
  );
}

export function validateRegistration(
  input: RegistrationInput,
  types: RubgramType[],
) {
  if (!input.name || !input.server || !input.service.length || !input.user)
    return messages.incomplete;
  if (!(["as", "eu", "us", "tw"] as string[]).includes(input.server))
    return messages.invalidServer;
  const typeIds = new Set(types.map((type) => type.id));
  if (input.service.some((service) => !typeIds.has(service)))
    return messages.invalidService;
  if (input.name.length > 32) return messages.nameTooLong;
}

export async function requireOwner(actor: RubgramActor, owner: string) {
  if (actor.userId === owner || (await actor.isAdmin())) return;
  throw new Error(messages.unauthorized);
}

export async function requireAdmin(actor: RubgramActor) {
  if (!(await actor.isAdmin())) throw new Error(messages.unauthorized);
}

export type RegistrationDependencies = {
  getConfig: () => Promise<RubgramConfig>;
  removeExpired: () => Promise<unknown>;
  findDuplicate: (user: string) => Promise<QueueResult | undefined>;
  insert: (input: {
    user: string;
    name: string;
    server: "as" | "eu" | "us" | "tw";
    service: string[];
    price: number;
  }) => Promise<QueueResult>;
  consumeFreeSlot: () => Promise<void>;
};

export async function registerSubmission(
  input: RegistrationInput,
  dependencies: RegistrationDependencies,
): Promise<QueueResult | string> {
  let config = await dependencies.getConfig();
  const validationError = validateRegistration(input, config.types);
  if (validationError) return validationError;
  if (config.locked) return messages.locked;

  await dependencies.removeExpired();
  config = await dependencies.getConfig();
  if (config.full) return `คิวลงทะเบียนเต็มแล้ว (${config.limit} ครั้ง)`;
  const duplicate = await dependencies.findDuplicate(input.user!);
  if (duplicate) return duplicate;

  const price = calculatePrice(input.service, config);
  const queue = await dependencies.insert({
    user: input.user!,
    name: input.name,
    server: input.server as "as" | "eu" | "us" | "tw",
    service: input.service,
    price,
  });
  if (price === 0 && config.free > 0) await dependencies.consumeFreeSlot();
  return queue;
}

export type SlipResult =
  | { success: true; data: { transRef: string; amount?: number } }
  | { success: false; code: number; message: string };

export type PaymentRepository = {
  findSubmission: (id: string) => Promise<Submission | undefined>;
  findExpired: (id: string) => Promise<ExpiredSubmission | undefined>;
  restoreExpired: (
    submission: ExpiredSubmission,
    price: number,
  ) => Promise<void>;
  insertSlip: (input: {
    slip: Buffer<ArrayBuffer>;
    ref: string;
    amount?: number;
    data: SlipResult;
  }) => Promise<string>;
  markPaid: (submissionId: string, slipId: string) => Promise<QueueResult>;
};

export type PaymentDependencies = {
  transaction: <T>(
    run: (repository: PaymentRepository) => Promise<T>,
  ) => Promise<T>;
  calculatePrice: (service: string[]) => Promise<number>;
  checkSlip: (
    buffer: Buffer<ArrayBuffer>,
    type: string,
    price: number,
  ) => Promise<SlipResult>;
  isDuplicateSlipError: (error: unknown) => boolean;
};

export async function paySubmission(
  input: { id: string; slip: Buffer<ArrayBuffer>; type: string },
  actor: RubgramActor,
  dependencies: PaymentDependencies,
): Promise<QueueResult | string> {
  return dependencies.transaction(async (repository) => {
    let submission = await repository.findSubmission(input.id);
    const expired = submission
      ? undefined
      : await repository.findExpired(input.id);
    if (!submission && !expired) return messages.notRegistered;

    await requireOwner(actor, (submission ?? expired)!.user);
    if (!submission) {
      const price = await dependencies.calculatePrice(expired!.service);
      await repository.restoreExpired(expired!, price);
      submission = { ...expired!, price };
    }

    const processed = await dependencies.checkSlip(
      input.slip,
      input.type,
      submission.price,
    );
    if (!processed.success) return `${processed.code}: ${processed.message}`;

    let slipId: string;
    try {
      slipId = await repository.insertSlip({
        slip: input.slip,
        ref: processed.data.transRef,
        amount: processed.data.amount,
        data: processed,
      });
    } catch (error) {
      if (dependencies.isDuplicateSlipError(error))
        return messages.duplicateSlip;
      throw error;
    }
    return repository.markPaid(input.id, slipId);
  });
}

export type ExpirationRepository<T extends { id: string; queue: number }> = {
  findExpired: (now: Date) => Promise<T[]>;
  archive: (submissions: T[]) => Promise<void>;
  remove: (ids: string[]) => Promise<void>;
  shiftAfter: (queue: number) => Promise<void>;
  getMaxQueue: () => Promise<number | null>;
  setNextQueue: (next: number) => Promise<void>;
};

export async function compactExpiredSubmissions<
  T extends { id: string; queue: number },
>(repository: ExpirationRepository<T>, now = new Date()) {
  const expired = await repository.findExpired(now);
  if (expired.length) {
    await repository.archive(expired);
    await repository.remove(expired.map(({ id }) => id));
    for (const { queue } of [...expired].sort((a, b) => b.queue - a.queue))
      await repository.shiftAfter(queue);
  }
  const maxQueue = await repository.getMaxQueue();
  await repository.setNextQueue((maxQueue ?? 0) + 1);
  return { removed: expired.length };
}

export async function cancelSubmission(
  id: string,
  actor: RubgramActor,
  dependencies: {
    findSubmission: (id: string) => Promise<{ user: string } | undefined>;
    cancel: (id: string) => Promise<void>;
  },
) {
  const submission = await dependencies.findSubmission(id);
  if (!submission) return false;
  await requireOwner(actor, submission.user);
  await dependencies.cancel(id);
  return true;
}

export async function addSubmissionNote(
  id: string,
  text: string,
  actor: RubgramActor,
  dependencies: {
    getNotes: (id: string) => Promise<Note[]>;
    saveNotes: (id: string, notes: Note[]) => Promise<void>;
    createId: () => string;
    now: () => Date;
  },
) {
  await requireAdmin(actor);
  const note = {
    id: dependencies.createId(),
    text,
    createdAt: dependencies.now().toISOString(),
  };
  await dependencies.saveNotes(id, [
    ...(await dependencies.getNotes(id)),
    note,
  ]);
  return note;
}

export async function deleteSubmissionNote(
  id: string,
  noteId: string,
  actor: RubgramActor,
  dependencies: {
    getNotes: (id: string) => Promise<Note[]>;
    saveNotes: (id: string, notes: Note[]) => Promise<void>;
  },
) {
  await requireAdmin(actor);
  const notes = await dependencies.getNotes(id);
  await dependencies.saveNotes(
    id,
    notes.filter((note) => note.id !== noteId),
  );
}

export async function runAdminOperation<T>(
  actor: RubgramActor,
  operation: () => Promise<T>,
) {
  await requireAdmin(actor);
  return operation();
}

export function isDuplicateSlipError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: string;
    constraint?: string;
    cause?: unknown;
  };
  if (candidate.code === "23505")
    return candidate.constraint?.includes("slips_ref") ?? false;
  return candidate.cause ? isDuplicateSlipError(candidate.cause) : false;
}
