"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { uidRegex } from "@/lib/const";
import { db } from "@/lib/db";
import {
  characters,
  endgameSettings,
  endgameSubmissions,
  settings,
  submissions,
} from "@/lib/db/schema";
import { sse } from "@/lib/utils";
import type { TypedFormData } from "./type";

export async function getEndgameConfig() {
  const [ngm]: (typeof endgameSettings.$inferSelect | undefined)[] = await db
    .select()
    .from(endgameSettings)
    .limit(1);
  const [glob]: (typeof settings.$inferSelect | undefined)[] = await db
    .select()
    .from(settings)
    .limit(1);
  const count = await db.$count(endgameSubmissions);
  const full = ngm?.limit !== -1 && count >= (ngm?.limit || 0);

  return {
    locked: false,
    limit: -1,
    enka: false,
    count,
    full,
    ...ngm,
    ...glob,
  };
}

export async function submitEndgame(
  formData: TypedFormData<{
    name: string;
    uid: string;
    character: string;
    comment: string;
  }>,
) {
  const { full, locked, limit } = await getEndgameConfig();
  const name = formData.get("name")?.toString();
  const uid = formData.get("uid")?.toString();
  const character = formData.get("character")?.toString();
  const comment = formData.get("comment")?.toString() || "";
  if (!name || !uid || !character) return "กรุณากรอกข้อมูลให้ครบถ้วน";
  if (name.length > 32) return "ชื่อยาวเกินไป ต้องไม่เกิน 32 ตัวอักษร";
  if (!uidRegex.test(uid)) return "UID ไม่ถูกต้อง ต้องเป็นเลข 9 หลัก";
  if (comment.length > 256) return "ข้อความเพิ่มเติมยาวเกินไป ต้องไม่เกิน 512 ตัวอักษร";
  if (locked) return "ปิดรับลงทะเบียนชั่วคราว เนื่องจากมีผู้ลงจำนวนมาก";
  if (full) return `คิวลงทะเบียนเต็มแล้ว (${limit} ครั้ง)`;
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
    .returning({ queue: endgameSubmissions.queue, id: endgameSubmissions.id });
  revalidatePath("/artifact/admin");
  sse.publish({}, { topic: "artifact-ev", event: "update" });
  return queue;
}
