"use server";

import { and, eq, inArray, not, or, sql } from "drizzle-orm";
import { getTableConfig, type PgDatabase } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiAuthCheck } from "./auth";
import { uidRegex } from "./const";
import { db } from "./db";
import {
  artifactSettings,
  cdn,
  characters,
  settings,
  submissions,
  tierlistBadges,
  tierlistColumns,
  tierlistStates,
  tierlistTiers,
  tierlistTypes,
  tierlistVersions,
} from "./db/schema";
import { sse } from "./utils";

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
  const config = await getArtifactConfig();
  const name = formData.get("name")?.toString();
  const uid = formData.get("uid")?.toString();
  const character = formData.get("character")?.toString();
  const comment = formData.get("comment")?.toString() || "";
  if (!name || !uid || !character) return "กรุณากรอกข้อมูลให้ครบถ้วน";
  if (name.length > 32) return "ชื่อยาวเกินไป ต้องไม่เกิน 32 ตัวอักษร";
  if (!uidRegex.test(uid)) return "UID ไม่ถูกต้อง ต้องเป็นเลข 9 หลัก";
  if (comment.length > 256) return "ข้อความเพิ่มเติมยาวเกินไป ต้องไม่เกิน 512 ตัวอักษร";
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
  sse.publish({}, { topic: "artifact-ev", event: "update" });
  return queue;
}

export async function toggleCheck(submissionId: string) {
  if (!(await apiAuthCheck())) throw "Unauthorized";
  await db
    .update(submissions)
    .set({
      checked: not(submissions.checked),
    })
    .where(eq(submissions.id, submissionId));
  revalidatePath("/artifact/admin");
  revalidatePath("/artifact");
}

export async function toggleLock() {
  if (!(await apiAuthCheck())) throw "Unauthorized";
  if (
    (
      await db
        .update(artifactSettings)
        .set({
          locked: not(artifactSettings.locked),
        })
        .returning({ id: artifactSettings.id })
    ).length === 0
  )
    await db.insert(artifactSettings).values({ locked: true });
  revalidatePath("/artifact/admin");
  revalidatePath("/artifact");
}

export async function setLimit(limit: number) {
  if (!(await apiAuthCheck())) throw "Unauthorized";

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
}

export async function wipe() {
  if (!(await apiAuthCheck())) throw "Unauthorized";
  await db.delete(submissions);
  await db.execute(
    sql`ALTER SEQUENCE artifact.submissions_queue_seq RESTART WITH 1`,
  );
  revalidatePath("/artifact/admin");
  revalidatePath("/artifact");
  redirect("/artifact/admin");
}

export async function random() {
  if (!(await apiAuthCheck())) throw "Unauthorized";
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
  if (!(await apiAuthCheck())) throw "Unauthorized";
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
  sse.publish(states, { topic: `tl-${list}`, event: "update_states" });
}

export async function tlPlacements(
  list: string,
  placements: Record<string, string[]>,
) {
  if (!(await apiAuthCheck())) throw "Unauthorized";

  // biome-ignore lint/correctness/noUnusedVariables: immutable property removal
  const { untiered, ...placementObj } = placements;

  await db
    .update(tierlistVersions)
    .set({
      placements: placementObj,
    })
    .where(eq(tierlistVersions.id, list));

  revalidatePath(`/api/tl/${list}`);
  sse.publish(placements, { topic: `tl-${list}`, event: "update_placements" });
}

export async function cdnDelete(ids: string[], force = false) {
  if (force) await db.delete(cdn).where(inArray(cdn.id, ids));
  else
    for (const id of ids) {
      const refs = await cdnReferences(id);
      if (refs.length) {
        revalidatePath("/cdn/admin");
        return { id, refs };
      }
      await db.delete(cdn).where(eq(cdn.id, id));
    }
  revalidatePath("/cdn/admin");
}

export async function cdnReferences(
  id: string,
  // biome-ignore lint/suspicious/noExplicitAny: type parameters
  tx: PgDatabase<any, any, any> = db,
) {
  const tables = [
    [characters, "image"],
    [tierlistTypes, "image"],
    [tierlistTiers, "image"],
    [tierlistColumns, "image"],
    [tierlistBadges, "image"],
    [tierlistVersions, "image", "disclaimer"],
  ] as const;
  const promises: Promise<{
    table: string;
    cols: string[];
  }>[] = [];
  for (const [table, ...cols] of tables)
    promises.push(
      tx
        .select({ id: table.id })
        .from(table)
        .where(
          or(
            ...cols.map((c) =>
              eq(table[c as keyof typeof table._.columns], id),
            ),
          ),
        )
        .then((r) => {
          const config = getTableConfig(table);
          return {
            table: config.schema
              ? `${config.schema}.${config.name}`
              : config.name,
            cols: r.map((c) => c.id),
          };
        }),
    );
  return Promise.all(promises).then((l) =>
    l
      .filter((t) => t.cols.length)
      .flatMap((t) => t.cols.map((c) => `${t.table}#${c}`)),
  );
}

export async function cdnify(
  data: Blob | File,
  // biome-ignore lint/suspicious/noExplicitAny: type parameters
  config: { tx?: PgDatabase<any, any, any>; name?: string } = {},
) {
  const { tx = db, name } = config;
  const [{ id }] = await tx
    .insert(cdn)
    .values({
      name: name || (data instanceof File ? (data as File).name : null),
      data: Buffer.from(await data.arrayBuffer()),
      size: `${data.size}`,
      type: data.type,
    })
    .returning({ id: cdn.id });

  try {
    revalidatePath("/admin/cdn");
  } catch {}
  return id;
}
