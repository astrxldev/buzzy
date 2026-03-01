"use server";

import { and, eq, inArray, isNotNull, not, or, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TypedFormData } from "@/app/(ui)/rubgram/type";
import { adminCheck } from "./auth";
import { uidRegex } from "./const";
import { db } from "./db";
import { ps } from "./db/redis";
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

export async function submitArtifact(formData: FormData) {
  const form = formData as unknown as TypedFormData<{
    name: string;
    uid: string;
    character: string;
    comment: string;
  }>;
  const config = await getArtifactConfig();
  const name = form.get("name")?.toString();
  const uid = form.get("uid")?.toString();
  const character = form.get("character")?.toString();
  const comment = form.get("comment")?.toString() || "";
  if (!name || !uid || !character) return "กรุณากรอกข้อมูลให้ครบถ้วน";
  if (name.length > 64) return "ชื่อยาวเกินไป ต้องไม่เกิน 64 ตัวอักษร";
  if (!uidRegex.test(uid)) return "UID ไม่ถูกต้อง ต้องเป็นเลข 9 หรือ 10 หลัก เท่านั้น";
  if (comment.length > 1024) return "ข้อความเพิ่มเติมยาวเกินไป ต้องไม่เกิน 1024 ตัวอักษร";
  if (config.locked) return "ปิดรับลงทะเบียนชั่วคราว เนื่องจากมีผู้ลงจำนวนมาก";
  const count = await db.$count(submissions);
  if (config.limit !== -1 && count >= config.limit)
    return `คิวลงทะเบียนเต็มแล้ว (${config.limit} ครั้ง)`;
  const [char] = await db
    .select()
    .from(characters)
    .where(eq(characters.name, character))
    .limit(1);
  if (!char) return "ไม่พบตัวละครที่เลือก";
  const [existing] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.uid, uid))
    .limit(1);
  if (existing) return "คุณลงทะเบียนไปแล้ว";
  const [queue] = await db
    .insert(submissions)
    .values({
      uid,
      name,
      comment,
      char: char.name,
    })
    .returning({ queue: submissions.queue, id: submissions.id });
  revalidatePath("/artifact/admin");
  ps.publish({ type: "submit" }, { topic: "artifact", event: "update" });
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

  ps.publish({ type: "toggleCheck" }, { topic: "artifact", event: "update" });
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

  ps.publish({ type: "toggleLock" }, { topic: "artifact", event: "update" });
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

  ps.publish({ type: "setLimit" }, { topic: "artifact", event: "update" });
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
  revalidatePath("/artifact/admin");
  revalidatePath("/artifact");

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
          eq(tierlistStates.char, `${data.char}`),
          eq(tierlistStates.list, `${data.list}`),
        ),
      ),
    );
  if (existing)
    await db
      .update(tierlistStates)
      .set(data)
      .where(eq(tierlistStates.uuid, `${data.uuid}`));
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
  ps.publish(states, { topic: `tl.${list}`, event: "update_states" });
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
  ps.publish(placements, { topic: `tl.${list}`, event: "update_placements" });
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

  if (res) ps.publish(res, { topic: "log" });
}
