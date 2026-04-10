"use server";

import { randomUUIDv7 } from "bun";
import { and, eq, inArray, isNotNull, lt, not, or, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";
import { adminCheck } from "./auth";
import { uidRegex } from "./const";
import { db } from "./db";
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

const ArtifactSubmission = (editToken?: string) =>
  z.object(
    {
      name: z.string().max(64, "ชื่อยาวเกินไป ต้องไม่เกิน 64 ตัวอักษร"),
      uid: z
        .string()
        .regex(uidRegex, "UID ไม่ถูกต้อง ต้องเป็นเลข 9 หรือ 10 หลัก เท่านั้น")
        .refine(
          (uid) =>
            db
              .select()
              .from(submissions)
              .where(
                and(
                  eq(submissions.uid, uid),
                  editToken
                    ? not(eq(submissions.editToken, editToken))
                    : undefined,
                ),
              )
              .limit(1)
              .then((r) => !r.length),
          "คุณลงทะเบียนไปแล้ว",
        ),
      character: z.string().refine(
        (char) =>
          db
            .select()
            .from(characters)
            .where(eq(characters.name, char))
            .limit(1)
            .then((r) => !!r.length),
        "ไม่พบตัวละครที่เลือก",
      ),
      comment: z
        .string()
        .max(1024, "ข้อความเพิ่มเติมยาวเกินไป ต้องไม่เกิน 1024 ตัวอักษร"),
    },
    "กรุณากรอกข้อมูลให้ครบถ้วน",
  );

export async function submitArtifact(
  formData: FormData,
  edit?: { sub: string; token: string },
) {
  const config = await getArtifactConfig();
  if (config.locked) return "ปิดรับลงทะเบียนชั่วคราว เนื่องจากมีผู้ลงจำนวนมาก";
  const count = await db.$count(submissions);
  if (config.limit !== -1 && count >= config.limit)
    return `คิวลงทะเบียนเต็มแล้ว (${config.limit} ครั้ง)`;
  const { success, data, error } = await ArtifactSubmission(
    edit?.token,
  ).safeParseAsync(Object.fromEntries(formData.entries()));
  if (!success) return z.prettifyError(error);
  if (edit) {
    const [existing] = await db
      .delete(submissions)
      .where(
        and(
          eq(submissions.id, edit.sub),
          eq(submissions.editToken, edit.token),
          lt(submissions.edits, 5),
          not(submissions.checked),
        ),
      )
      .returning();

    if (!existing) return "คิวนี้แก้ไม่ได้แล้ว";

    const [queue] = await db
      .insert(submissions)
      .values({
        ...data,
        char: data.character,
        queue: existing.queue,
        edits: existing.edits + 1,
        editToken: randomUUIDv7(),
      })
      .returning({ queue: submissions.queue, id: submissions.id });
    // clear card cache
    await db.delete(cards).where(eq(cards.submission, queue.id));
    revalidatePath("/artifact/admin");
    sse.artifact.pub("update", { type: "submit" });
    return queue;
  }
  const [queue] = await db
    .insert(submissions)
    .values({
      ...data,
      char: data.character,
    })
    .returning({ queue: submissions.queue, id: submissions.id });
  revalidatePath("/artifact/admin");
  sse.artifact.pub("update", { type: "submit" });
  return queue;
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
    `http://mts.dgnr.us:8809/v1/card/genshin/${uid}/${ch ? ch.amber.split("-")[0] : "10000005"}?debug=dump`,
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
  if (!(await adminCheck())) throw "Unauthorized";

  if (
    (
      await db
        .update(artifactSettings)
        .set({
          limit,
        })
        .returning({ id: artifactSettings.id })
    ).length === 0
  )
    await db.insert(artifactSettings).values({ limit });
  revalidatePath("/artifact/admin");
  revalidatePath("/artifact");

  sse.artifact.pub("update", { type: "setLimit" });
  await actionLog(
    `Set artifact submit limit to ${limit < 0 ? "unlimited" : limit}`,
  );
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
  if (!(await adminCheck())) throw "Unauthorized";
  const [existing] = await db
    .select()
    .from(tierlistStates)
    .where(
      or(
        eq(tierlistStates.uuid, `${data.uuid}`),
        and(
          eq(tierlistStates.ref, `${data.ref}`),
          eq(tierlistStates.list, `${data.list}`),
        ),
      ),
    );
  if (existing)
    await db
      .update(tierlistStates)
      .set(data)
      .where(eq(tierlistStates.uuid, existing.uuid));
  else
    await db
      .insert(tierlistStates)
      .values(data as typeof tierlistStates.$inferInsert);
  const list = data.list || existing?.list;
  const states = await db
    .select()
    .from(tierlistStates)
    .where(eq(tierlistStates.list, list));

  revalidatePath(`/api/tl/${list}/states`);

  await actionLog(`Updated a state in tierlist ${list}`, data);
  tlSse(list).pub("update_states", states);
}

export async function tlPlacements(
  list: string,
  placements: Record<string, string[]>,
) {
  if (!(await adminCheck())) throw "Unauthorized";

  const { untiered, ...placementObj } = placements;

  await db
    .update(tierlistVersions)
    .set({
      placements: placementObj,
    })
    .where(eq(tierlistVersions.id, list));

  revalidatePath(`/api/tl/${list}`);

  await actionLog(`Updated a placement in tierlist ${list}`);
  tlSse(list).pub("update_placements", placements);
}

export async function cdnDelete(ids: string[], force = false) {
  let deleted = 0;

  if (force) await db.delete(cdn).where(inArray(cdn.id, ids));
  else
    return await db.transaction(async (tx) => {
      for (const id of ids) {
        const refs = await checkCdnRefs(id, tx);
        if (refs.length) {
          revalidatePath("/cdn/admin");
          if (deleted)
            await actionLog(
              `Deleted ${deleted}/${ids.length}(Incomplete) files`,
              ids.slice(0, deleted),
            );
          return { id, refs };
        }
        await tx.delete(cdn).where(eq(cdn.id, id));
        deleted++;
      }
      revalidatePath("/cdn/admin");

      await actionLog(`Deleted ${deleted} files`, ids);
    });
}

export async function checkCdnRefs(
  id: string | string[],
  // biome-ignore lint/suspicious/noExplicitAny: type parameters
  tx: PgDatabase<any, any, any> = db,
): Promise<string[]> {
  return typeof id === "string"
    ? tx
        .select()
        .from(cdnReferences)
        .where(eq(cdnReferences.cdn, id))
        .then((r) => r.map((ref) => `${id}=>${ref.table}#${ref.id}`))
    : Promise.all(id.map((v) => checkCdnRefs(v, tx))).then((a) => a.flat());
}

export async function cdnify(
  data: Blob | File,
  // biome-ignore lint/suspicious/noExplicitAny: type parameters
  config: { tx?: PgDatabase<any, any, any>; name?: string } = {},
) {
  const { tx = db, name = data instanceof File ? (data as File).name : null } =
    config;
  const [{ id }] = await tx
    .insert(cdn)
    .values({
      name: name,
      data: Buffer.from(await data.arrayBuffer()),
      size: `${data.size}`,
      type: data.type,
    })
    .returning({ id: cdn.id });

  await actionLog(`File uploaded: ${name || `[${id}]`} (${b2s(data.size)})`);

  try {
    revalidatePath("/admin/cdn");
  } catch {}
  return id;
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
