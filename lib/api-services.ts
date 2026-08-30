import z from "zod";
import { uidRegex } from "./const";

export type ArtifactSubmissionData = {
  name: string;
  uid: string;
  character: string;
  comment: string;
};

export type ArtifactEdit = { sub: string; token: string };

export type ArtifactSubmissionResult = { id: string; queue: number | null };

export type ArtifactServiceDependencies = {
  getConfig: () => Promise<{ locked: boolean; limit: number }>;
  countQueued: () => Promise<number>;
  uidExists: (uid: string, excludeEditToken?: string) => Promise<boolean>;
  characterExists: (character: string) => Promise<boolean>;
  insert: (data: ArtifactSubmissionData) => Promise<ArtifactSubmissionResult>;
  replace: (
    edit: ArtifactEdit,
    data: ArtifactSubmissionData,
    editToken: string,
  ) => Promise<ArtifactSubmissionResult | undefined>;
  createEditToken: () => string;
  afterSubmit: () => void | Promise<void>;
};

const ArtifactSubmission = z.object(
  {
    name: z.string().max(64, "ชื่อยาวเกินไป ต้องไม่เกิน 64 ตัวอักษร"),
    uid: z.string().regex(uidRegex, "UID ไม่ถูกต้อง ต้องเป็นเลข 9 หรือ 10 หลัก เท่านั้น"),
    character: z.string(),
    comment: z.string().max(1024, "ข้อความเพิ่มเติมยาวเกินไป ต้องไม่เกิน 1024 ตัวอักษร"),
  },
  "กรุณากรอกข้อมูลให้ครบถ้วน",
);

export async function submitArtifactService(
  input: Record<string, FormDataEntryValue>,
  edit: ArtifactEdit | undefined,
  deps: ArtifactServiceDependencies,
) {
  const config = await deps.getConfig();
  if (config.locked) return "ปิดรับลงทะเบียนชั่วคราว เนื่องจากมีผู้ลงจำนวนมาก";

  if (!edit) {
    const count = await deps.countQueued();
    if (config.limit !== -1 && count >= config.limit)
      return `คิวลงทะเบียนเต็มแล้ว (${config.limit} ครั้ง)`;
  }

  const parsed = ArtifactSubmission.safeParse(input);
  if (!parsed.success) return z.prettifyError(parsed.error);

  const data = parsed.data;
  if (await deps.uidExists(data.uid, edit?.token)) return "คุณลงทะเบียนไปแล้ว";
  if (!(await deps.characterExists(data.character))) return "ไม่พบตัวละครที่เลือก";

  const queue = edit
    ? await deps.replace(edit, data, deps.createEditToken())
    : await deps.insert(data);
  if (!queue) return "คิวนี้แก้ไม่ได้แล้ว";

  await deps.afterSubmit();
  return queue;
}

export type AdminDependencies = {
  adminCheck: () => Promise<unknown>;
};

async function requireAdmin(deps: AdminDependencies) {
  if (!(await deps.adminCheck())) throw "Unauthorized";
}

export type SetLimitDependencies = AdminDependencies & {
  persist: (limit: number) => Promise<void>;
  afterSet: (limit: number) => void | Promise<void>;
};

export async function setArtifactLimitService(
  limit: number,
  deps: SetLimitDependencies,
) {
  await requireAdmin(deps);
  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < -1)
    throw new TypeError(
      "Artifact limit must be a finite integer greater than or equal to -1",
    );
  await deps.persist(limit);
  await deps.afterSet(limit);
}

export type TierlistState = {
  uuid?: string;
  char?: string;
  ref?: string;
  list?: string;
  comment?: string;
  badges?: string[] | null;
};

type StoredTierlistState = TierlistState & {
  uuid: string;
  char: string;
  ref: string;
  list: string;
  comment: string;
  badges: string[] | null;
};

type InsertTierlistState = TierlistState & {
  char: string;
  ref: string;
  list: string;
};

export type TierlistStateDependencies = AdminDependencies & {
  find: (
    identifier: { uuid: string } | { ref: string; list: string },
  ) => Promise<StoredTierlistState | undefined>;
  update: (uuid: string, data: TierlistState) => Promise<void>;
  insert: (data: InsertTierlistState) => Promise<void>;
  getStates: (list: string) => Promise<StoredTierlistState[]>;
  afterSet: (
    list: string,
    states: StoredTierlistState[],
    data: TierlistState,
  ) => void | Promise<void>;
};

const nonEmpty = z.string().min(1);
const TierlistStateData = z.object({
  uuid: nonEmpty.optional(),
  char: nonEmpty.optional(),
  ref: nonEmpty.optional(),
  list: nonEmpty.optional(),
  comment: z.string().optional(),
  badges: z.array(nonEmpty).max(4).nullable().optional(),
});

export async function setTierlistStateService(
  input: TierlistState,
  deps: TierlistStateDependencies,
) {
  await requireAdmin(deps);
  const data = TierlistStateData.parse(input);
  const identifier = data.uuid
    ? { uuid: data.uuid }
    : data.ref && data.list
      ? { ref: data.ref, list: data.list }
      : undefined;
  if (!identifier)
    throw new TypeError("Tierlist state requires uuid or both ref and list");

  const existing = await deps.find(identifier);
  if (existing) await deps.update(existing.uuid, data);
  else {
    const inserted = z
      .object({ char: nonEmpty, ref: nonEmpty, list: nonEmpty })
      .passthrough()
      .parse(data) as InsertTierlistState;
    await deps.insert(inserted);
  }

  const list = data.list ?? existing?.list;
  if (!list) throw new TypeError("Tierlist state list is required");
  const states = await deps.getStates(list);
  await deps.afterSet(list, states, data);
}

export type TierlistPlacementsDependencies = AdminDependencies & {
  persist: (
    list: string,
    placements: Record<string, string[]>,
  ) => Promise<void>;
  afterSet: (
    list: string,
    placements: Record<string, string[]>,
  ) => void | Promise<void>;
};

const Placements = z.record(nonEmpty, z.array(nonEmpty));

export async function setTierlistPlacementsService(
  listInput: string,
  placementsInput: Record<string, string[]>,
  deps: TierlistPlacementsDependencies,
) {
  await requireAdmin(deps);
  const list = nonEmpty.parse(listInput);
  const placements = Placements.parse(placementsInput);
  const { untiered: _, ...persisted } = placements;
  await deps.persist(list, persisted);
  await deps.afterSet(list, placements);
}

export type CdnReference = { table: string; id: string };

export async function checkCdnRefsService(
  id: string | string[],
  findRefs: (id: string) => Promise<CdnReference[]>,
): Promise<string[]> {
  const ids = typeof id === "string" ? [id] : id;
  const refs = await Promise.all(
    ids.map(async (cdnId) =>
      (await findRefs(cdnId)).map((ref) => `${cdnId}=>${ref.table}#${ref.id}`),
    ),
  );
  return refs.flat();
}

export type CdnDeleteDependencies<Tx> = AdminDependencies & {
  transaction: <T>(callback: (tx: Tx) => Promise<T>) => Promise<T>;
  findRefs: (id: string, tx: Tx) => Promise<CdnReference[]>;
  deleteOne: (id: string, tx: Tx) => Promise<void>;
  deleteMany: (ids: string[]) => Promise<void>;
  afterDelete: (
    deleted: number,
    ids: string[],
    incomplete: boolean,
  ) => Promise<void>;
};

export async function deleteCdnService<Tx>(
  ids: string[],
  force: boolean,
  deps: CdnDeleteDependencies<Tx>,
) {
  await requireAdmin(deps);
  if (force) {
    await deps.deleteMany(ids);
    await deps.afterDelete(ids.length, ids, false);
    return;
  }

  const result = await deps.transaction(async (tx) => {
    let deleted = 0;
    for (const id of ids) {
      const refs = await deps.findRefs(id, tx);
      if (refs.length) return { id, refs, deleted };
      await deps.deleteOne(id, tx);
      deleted++;
    }
    return { deleted };
  });

  await deps.afterDelete(result.deleted, ids, "id" in result);
  if ("id" in result && result.refs) {
    return {
      id: result.id,
      refs: result.refs.map((ref) => `${result.id}=>${ref.table}#${ref.id}`),
    };
  }
}

export type CdnifyDependencies = {
  insert: (data: {
    name: string | null;
    data: Buffer;
    size: string;
    type: string;
  }) => Promise<string>;
  afterUpload: (id: string, name: string | null, size: number) => Promise<void>;
};

export async function cdnifyService(
  data: Blob | File,
  name: string | null,
  deps: CdnifyDependencies,
) {
  const id = await deps.insert({
    name,
    data: Buffer.from(await data.arrayBuffer()),
    size: `${data.size}`,
    type: data.type,
  });
  await deps.afterUpload(id, name, data.size);
  return id;
}

export type AmberVhDependencies = {
  getCached: () => Promise<unknown>;
  fetchVersion: () => Promise<unknown>;
  setCached: (value: string) => void | Promise<void>;
  schedule?: (callback: () => void) => void;
};

const AmberVersion = z.object({
  response: z.number().positive(),
  data: z.object({ vh: z.string().max(10) }),
});

export async function getAmberVhService(deps: AmberVhDependencies) {
  try {
    const cached = await deps.getCached();
    if (typeof cached === "string" && cached) return cached;
  } catch {}

  const { data } = AmberVersion.parse(await deps.fetchVersion());
  const schedule = deps.schedule ?? queueMicrotask;
  schedule(() => {
    Promise.resolve(deps.setCached(data.vh)).catch(() => {});
  });
  return data.vh;
}
