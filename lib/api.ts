"use server";

import { eq, inArray, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { apiAuthCheck } from "./auth";
import { uidRegex } from "./const";
import { db } from "./db";
import {
  artifactSettings,
  characters,
  settings,
  submissions,
} from "./db/schema";

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
  return { locked: false, limit: -1, enka: true, ...art, ...glob };
}

export async function submitArtifact(formData: FormData) {
  const config = await getArtifactConfig();
  const name = formData.get("name")?.toString();
  const uid = formData.get("uid")?.toString();
  const character = formData.get("character")?.toString();
  const comment = formData.get("comment")?.toString() || "";
  if (!name || !uid || !character) throw "กรุณากรอกข้อมูลให้ครบถ้วน";
  if (name.length > 32) throw "ชื่อยาวเกินไป ต้องไม่เกิน 32 ตัวอักษร";
  if (!uidRegex.test(uid)) throw "UID ไม่ถูกต้อง ต้องเป็นเลข 9 หลัก";
  if (comment.length > 256) throw "ข้อความเพิ่มเติมยาวเกินไป ต้องไม่เกิน 512 ตัวอักษร";
  if (config.locked) throw "ปิดรับลงทะเบียนชั่วคราว เนื่องจากมีผู้ลงจำนวนมาก";
  const count = await db.$count(submissions);
  if (config.limit !== -1 && count >= config.limit)
    throw `คิวลงทะเบียนเต็มแล้ว (${config.limit} ครั้ง)`;
  const [char] = await db
    .select()
    .from(characters)
    .where(eq(characters.name, character))
    .limit(1);
  if (!char) throw "ไม่พบตัวละครที่เลือก";
  const [existing] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.uid, uid))
    .limit(1);
  if (existing) throw "คุณลงทะเบียนไปแล้ว";
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
}
