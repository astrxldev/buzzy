"use server";

import { fetch, randomUUIDv7 } from "bun";
import { and, eq, inArray, isNotNull, lt, not, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type CdnReference,
  cdnifyService,
  checkCdnRefsService,
  deleteCdnService,
  getAmberVhService,
  setArtifactLimitService,
  setTierlistPlacementsService,
  setTierlistStateService,
  submitArtifactService,
} from "./api-services";
import { adminCheck } from "./auth";
import { db } from "./db";
import { redis } from "./db/redis";
import { cdnReferences } from "./db/references";
import {
  artifactSettings,
  auditLog,
  cards,
  cdn,
  characters,
  settings,
  submissions,
  tierlistStates,
  tierlistVersions,
} from "./db/schema";
import { sse, tlSse } from "./db/sse-endpoints";
import { b2s } from "./utils";

export async function getCharacters(chars: string[]) {
  return await db
    .select()
    .from(characters)
    .where(inArray(characters.amber, chars));
}

export async function getArtifactConfig() {
  const [art] = await db.select().from(artifactSettings).limit(1);
  const [glob] = await db.select().from(settings).limit(1);
  // @ts-expect-error
  return { locked: false, limit: -1, enka: false, ...art, ...glob };
}

export async function submitArtifact(
  formData: FormData,
  edit?: { sub: string; token: string },
) {
  return submitArtifactService(Object.fromEntries(formData.entries()), edit, {
    getConfig: getArtifactConfig,
    countQueued: () =>
      db
        .select({ a: sql`NULL` })
        .from(submissions)
        .where(isNotNull(submissions.queue))
        .then((rows) => rows.length),
    uidExists: (uid, excludeEditToken) =>
      db
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.uid, uid),
            excludeEditToken
              ? not(eq(submissions.editToken, excludeEditToken))
              : undefined,
          ),
        )
        .limit(1)
        .then((rows) => !!rows.length),
    characterExists: (character) =>
      db
        .select()
        .from(characters)
        .where(eq(characters.name, character))
        .limit(1)
        .then((rows) => !!rows.length),
    insert: async (data) => {
      const { character, ...submission } = data;
      const [queue] = await db
        .insert(submissions)
        .values({ ...submission, char: character })
        .returning({ queue: submissions.queue, id: submissions.id });
      return queue;
    },
    replace: (edit, data, editToken) =>
      db.transaction(async (tx) => {
        const { character, ...submission } = data;
        const [queue] = await tx
          .update(submissions)
          .set({
            ...submission,
            char: character,
            edits: sql`${submissions.edits} + 1`,
            editToken,
          })
          .where(
            and(
              eq(submissions.id, edit.sub),
              eq(submissions.editToken, edit.token),
              lt(submissions.edits, 5),
              not(submissions.checked),
            ),
          )
          .returning({ queue: submissions.queue, id: submissions.id });
        if (queue) await tx.delete(cards).where(eq(cards.submission, queue.id));
        return queue;
      }),
    createEditToken: randomUUIDv7,
    afterSubmit: () => {
      revalidatePath("/artifact/admin");
      sse.artifact.pub("update", { type: "submit" });
    },
  });
}

export async function getCardStatus(submissionId: string) {
  if (!(await adminCheck())) throw "Unauthorized";
  const [res] = await db
    .select({
      cached: sql<boolean>`${isNotNull(cards.image)}`,
      error: cards.error,
    })
    .from(cards)
    .where(eq(cards.submission, submissionId));
  return res;
}

export async function checkEnkaStatus(uid: string, char: string) {
  const [ch] = await db
    .select({
      amber: characters.amber,
    })
    .from(characters)
    .where(eq(characters.name, char));
  const res = await fetch(
    `https://api.astrxl.dev/v1/card/genshin/${uid}/${ch ? ch.amber.split("-")[0] : "10000005"}?debug=dump`,
  );
  const text = await res.text(),
    { status } = res;
  if (text === "Character not found in showcase") return "showcase";
  if (text === "The showcase for this UID is private") return "private";
  if (status === 404) return "nf";
  return false;
}

export async function toggleCheck(submissionId: string) {
  if (!(await adminCheck())) throw "Unauthorized";
  await db
    .update(submissions)
    .set({
      checked: not(submissions.checked),
    })
    .where(eq(submissions.id, submissionId));
  revalidatePath("/artifact/admin");
  revalidatePath("/artifact");

  sse.artifact.pub("update", { type: "toggleCheck" });
  await actionLog(`Toggled an artifact submission check mark`);
}

export async function toggleLock() {
  if (!(await adminCheck())) throw "Unauthorized";
  const existing = await db
    .update(artifactSettings)
    .set({
      locked: not(artifactSettings.locked),
    })
    .returning({ locked: artifactSettings.locked });
  if (existing.length === 0)
    await db.insert(artifactSettings).values({ locked: true });
  revalidatePath("/artifact/admin");
  revalidatePath("/artifact");

  sse.artifact.pub("update", { type: "toggleLock" });
  await actionLog(
    `${(existing.length ? existing[0].locked : true) ? "Locked" : "Unlocked"} artifact submission`,
  );
}

export async function setLimit(limit: number) {
  return setArtifactLimitService(limit, {
    adminCheck,
    persist: async (value) => {
      const updated = await db
        .update(artifactSettings)
        .set({ limit: value })
        .returning({ id: artifactSettings.id });
      if (!updated.length)
        await db.insert(artifactSettings).values({ limit: value });
    },
    afterSet: async (value) => {
      revalidatePath("/artifact/admin");
      revalidatePath("/artifact");
      sse.artifact.pub("update", { type: "setLimit" });
      await actionLog(
        `Set artifact submit limit to ${value < 0 ? "unlimited" : value}`,
      );
    },
  });
}

export async function wipe() {
  if (!(await adminCheck())) throw "Unauthorized";
  await db.delete(submissions);
  await db.execute(
    sql`ALTER SEQUENCE artifact.submissions_queue_seq RESTART WITH 1`,
  );
  revalidatePath("/artifact");

  sse.artifact.pub("update", { type: "wipe" });
  await actionLog(`Deleted artifact submissions`);
  redirect("/artifact/admin");
}

export async function random() {
  if (!(await adminCheck())) throw "Unauthorized";
  const [sub] = await db
    .select()
    .from(submissions)
    .where(not(submissions.checked))
    .orderBy(sql`RANDOM()`)
    .limit(1);
  if (sub) redirect(`/artifact/admin/${sub.id}`);
  else throw "ไม่พบผู้ลงทะเบียนที่ยังไม่ตรวจสอบ";
}

export async function revalidateCard(sub: string) {
  if (!(await adminCheck())) throw "Unauthorized";
  await db.delete(cards).where(eq(cards.submission, sub));
  revalidatePath(`/api/card/${sub}`);
}

export async function tlState(
  data: Partial<typeof tierlistStates.$inferInsert>,
) {
  return setTierlistStateService(data, {
    adminCheck,
    find: async (identifier) => {
      const [existing] = await db
        .select()
        .from(tierlistStates)
        .where(
          "uuid" in identifier
            ? eq(tierlistStates.uuid, identifier.uuid)
            : and(
                eq(tierlistStates.ref, identifier.ref),
                eq(tierlistStates.list, identifier.list),
              ),
        );
      return existing;
    },
    update: async (uuid, state) => {
      await db
        .update(tierlistStates)
        .set(state)
        .where(eq(tierlistStates.uuid, uuid));
    },
    insert: async (state) => {
      await db.insert(tierlistStates).values(state);
    },
    getStates: (list) =>
      db.select().from(tierlistStates).where(eq(tierlistStates.list, list)),
    afterSet: async (list, states, state) => {
      revalidatePath(`/api/tl/${list}/states`);
      await actionLog(`Updated a state in tierlist ${list}`, state);
      tlSse(list).pub("update_states", states);
    },
  });
}

export async function tlPlacements(
  list: string,
  placements: Record<string, string[]>,
) {
  return setTierlistPlacementsService(list, placements, {
    adminCheck,
    persist: async (version, value) => {
      await db
        .update(tierlistVersions)
        .set({ placements: value })
        .where(eq(tierlistVersions.id, version));
    },
    afterSet: async (version, value) => {
      revalidatePath(`/api/tl/${version}`);
      await actionLog(`Updated a placement in tierlist ${version}`);
      tlSse(version).pub("update_placements", value);
    },
  });
}

export async function cdnDelete(ids: string[], force = false) {
  type CdnTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
  return deleteCdnService<CdnTransaction>(ids, force, {
    adminCheck,
    transaction: (callback) => db.transaction(callback),
    findRefs: (id, tx) =>
      tx
        .select()
        .from(cdnReferences)
        .where(eq(cdnReferences.cdn, id))
        .then((rows) => rows as unknown as CdnReference[]),
    deleteOne: async (id, tx) => {
      await tx.delete(cdn).where(eq(cdn.id, id));
    },
    deleteMany: async (values) => {
      if (values.length) await db.delete(cdn).where(inArray(cdn.id, values));
    },
    afterDelete: async (deleted, values, incomplete) => {
      revalidatePath("/cdn/admin");
      if (deleted || !incomplete)
        await actionLog(
          incomplete
            ? `Deleted ${deleted}/${values.length}(Incomplete) files`
            : `Deleted ${deleted} files`,
          incomplete ? values.slice(0, deleted) : values,
        );
    },
  });
}

export async function checkCdnRefs(
  id: string | string[],
  // biome-ignore lint/suspicious/noExplicitAny: type parameters
  tx: PgDatabase<any, any, any> = db,
): Promise<string[]> {
  return checkCdnRefsService(id, (value) =>
    tx
      .select()
      .from(cdnReferences)
      .where(eq(cdnReferences.cdn, value))
      .then((rows) => rows as unknown as CdnReference[]),
  );
}

export async function cdnify(
  data: Blob | File,
  // biome-ignore lint/suspicious/noExplicitAny: type parameters
  config: { tx?: PgDatabase<any, any, any>; name?: string } = {},
) {
  const { tx = db, name = data instanceof File ? (data as File).name : null } =
    config;
  return cdnifyService(data, name, {
    insert: async (value) => {
      const [{ id }] = await tx
        .insert(cdn)
        .values(value)
        .returning({ id: cdn.id });
      return id;
    },
    afterUpload: async (id, uploadName, size) => {
      await actionLog(
        `File uploaded: ${uploadName || `[${id}]`} (${b2s(size)})`,
      );
      try {
        revalidatePath("/admin/cdn");
      } catch {}
    },
  });
}

export async function actionLog(text: string, details?: unknown) {
  const session = await adminCheck();

  console.log(` LOG ${session?.name || ""} ${text}`);

  const [res] = await db
    .insert(auditLog)
    .values({
      author: session?.name,
      text,
      details,
    })
    .returning()
    .catch(() => {
      console.error(
        `Error logging audit log, printing it here:\n${session?.name || "[Unknown User]"} - ${text}`,
      );
      return [];
    });

  try {
    revalidatePath("/admin/log");
  } catch {}

  if (res) sse.log.pub("update", res);
}

export async function getAmberVh() {
  return getAmberVhService({
    getCached: async () => redis?.get("amber:vh"),
    fetchVersion: () =>
      fetch("https://gi.yatta.moe/api/v2/static/version").then((response) =>
        response.json(),
      ),
    setCached: async (vh) => {
      await redis?.setex("amber:vh", 86400, vh);
    },
  });
}
