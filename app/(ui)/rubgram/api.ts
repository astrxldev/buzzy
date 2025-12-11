"use server";

import {
  and,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  lt,
  not,
  or,
  sql,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import image from "next/image";
import { redirect } from "next/navigation";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { ps } from "@/lib/db/redis";
import {
  endgameArchive,
  endgameDiscord,
  endgameSettings,
  endgameSlips,
  endgameSubmissions,
  endgameTypes,
  settings,
} from "@/lib/db/schema";
import type { TypedFormData } from "./type";

const { SLIPOK_API_URL, SLIPOK_API_KEY, DISCORD_WEBHOOK_URL } =
  process.env as Record<string, string>;

export async function wipe() {
  if (!(await adminCheck())) throw "Unauthorized";
  await db.delete(endgameSubmissions);
  await db.execute(
    sql`ALTER SEQUENCE endgame.submissions_queue_seq RESTART WITH 1`,
  );
  revalidatePath("/rubgram/admin");
  revalidatePath("/rubgram");

  await actionLog(`Deleted rubgram submissions`);
  redirect("/rubgram/admin");
}

export async function random() {
  if (!(await adminCheck())) throw "Unauthorized";
  const [sub] = await db
    .select()
    .from(endgameSubmissions)
    .where(
      and(
        not(endgameSubmissions.checked),
        or(eq(endgameSubmissions.price, 0), isNotNull(endgameSubmissions.slip)),
      ),
    )
    .orderBy(sql`RANDOM()`)
    .limit(1);
  if (sub) redirect(`/rubgram/admin/${sub.id}`);
  else throw "ไม่พบผู้ลงทะเบียนที่ยังไม่ตรวจสอบ";
}

export async function toggleCheck(submissionId: string) {
  if (!(await adminCheck())) throw "Unauthorized";
  await db
    .update(endgameSubmissions)
    .set({
      checked: not(endgameSubmissions.checked),
    })
    .where(eq(endgameSubmissions.id, submissionId));
  revalidatePath("/rubgram/admin");
  revalidatePath("/rubgram");

  await actionLog(`Toggled an rubgram submission check mark`);
}

export async function toggleLock() {
  if (!(await adminCheck())) throw "Unauthorized";
  const existing = await db
    .update(endgameSettings)
    .set({
      locked: not(endgameSettings.locked),
    })
    .returning({ locked: endgameSettings.locked });
  if (existing.length === 0)
    await db.insert(endgameSettings).values({ locked: true });
  revalidatePath("/rubgram/admin");
  revalidatePath("/rubgram");

  await actionLog(
    `${(existing.length ? existing[0].locked : true) ? "Locked" : "Unlocked"} rubgram submission`,
  );
}

export async function setLimit(limit: number) {
  if (!(await adminCheck())) throw "Unauthorized";

  if (
    (
      await db
        .update(endgameSettings)
        .set({
          limit,
        })
        .returning({ id: endgameSettings.id })
    ).length === 0
  )
    await db.insert(endgameSettings).values({ limit });
  revalidatePath("/rubgram/admin");
  revalidatePath("/rubgram");

  await actionLog(
    `Set rubgram submit limit to ${limit < 0 ? "unlimited" : limit}`,
  );
}

export async function setFree(free: number) {
  if (!(await adminCheck())) throw "Unauthorized";

  if (
    (
      await db
        .update(endgameSettings)
        .set({
          free,
        })
        .returning({ id: endgameSettings.id })
    ).length === 0
  )
    await db.insert(endgameSettings).values({ free });
  revalidatePath("/rubgram/admin");
  revalidatePath("/rubgram");

  await actionLog(`Set rubgram submit limit to ${free}`);
}

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
  const types = await db
    .select()
    .from(endgameTypes)
    .orderBy(endgameTypes.order);
  const full = ngm && ngm.limit !== -1 && count >= (ngm.limit || 0);

  return {
    // @ts-expect-error
    locked: false,
    // @ts-expect-error
    limit: -1,
    // @ts-expect-error
    enka: false,
    // @ts-expect-error
    free: 0,
    count,
    full,
    types,
    ...ngm,
    ...glob,
  };
}

export type EndgameFormData = TypedFormData<{
  name: string;
  server: "as" | "eu" | "us" | "tw";
  service: string;
  user: string; // user snowflake
}>;

export async function submitEndgame(formData: EndgameFormData) {
  const { full, locked, limit, types } = await getEndgameConfig();
  const name = formData.get("name");
  const server = formData.get("server");
  const service = formData.getAll("service");
  const user = formData.get("user");
  if (!name || !server || !service.length || !user)
    return "กรุณากรอกข้อมูลให้ครบถ้วน";

  // ไม่ควรเกิดขึ้นแน่ๆ แต่กันไว้ก่อน
  if (!["as", "eu", "us", "tw"].includes(server)) return "เซิร์ฟไม่ถูกต้อง";
  if (service.some((s) => !types.map((t) => t.id).includes(s)))
    return "บริการไม่ถูกต้อง";

  if (name.length > 32) return "ชื่อยาวเกินไป ต้องไม่เกิน 32 ตัวอักษร";
  if (locked) return "ปิดรับลงทะเบียนชั่วคราว เนื่องจากมีผู้ลงจำนวนมาก";
  if (full) return `คิวลงทะเบียนเต็มแล้ว (${limit} ครั้ง)`;
  await removeExpiredSubmissions();
  const [existing] = await db
    .select({ queue: endgameSubmissions.queue, id: endgameSubmissions.id })
    .from(endgameSubmissions)
    .where(eq(endgameSubmissions.user, user))
    .limit(1);
  if (existing) return existing;
  const [queue] = await db
    .insert(endgameSubmissions)
    .values({
      user,
      name,
      server,
      service,
      price: await calcPrice(service),
    })
    .returning({ queue: endgameSubmissions.queue, id: endgameSubmissions.id });
  revalidatePath("/rubgram/admin");
  ps.publish({}, { topic: "rubgram", event: "update" });
  return queue;
}

export type EndgamePaymentFormData = TypedFormData<{
  sid: string;
  slip: File;
}>;

export async function submitEndgamePayment(formData: EndgamePaymentFormData) {
  const sid = formData.get("sid");
  const slip = formData.get("slip");
  if (!sid || !slip) return "กรุณาอัพโหลดสลิปให้ครบถ้วน";

  const arrayBuffer = await slip.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const queue = await db.transaction(async (tx) => {
    const [s] = await tx
      .select()
      .from(endgameSubmissions)
      .where(eq(endgameSubmissions.id, sid))
      .limit(1);
    const [a] = await tx
      .select()
      .from(endgameArchive)
      .where(eq(endgameArchive.id, sid))
      .limit(1);
    if (!s) {
      if (a)
        await tx.insert(endgameSubmissions).values({
          ...a,
          price: await calcPrice(a.service),
        });
      else return "คุณยังไม่ได้ลงทะเบียน";
    }

    // const processed = {
    //   success: true,
    //   data: { transRef: "test-abc", amount: 12345 },
    // } as const;
    const processed = await checkSlip(buffer, slip.type, (s || a).price);

    if (!processed.success) return `${processed.code}: ${processed.message}`;

    const [{ id: slipId }] = await tx
      .insert(endgameSlips)
      .values({
        slip: buffer,
        ref: processed.data.transRef,
        amount: processed.data.amount?.toString(),
        data: processed,
      })
      .returning({ id: endgameSlips.id })
      .catch((e) => {
        console.log(e);
        return [{ id: "conflict" }];
      });

    if (slipId === "conflict") return "สลิปนี้ถูกใช้ไปแล้ว";

    return await tx
      .update(endgameSubmissions)
      .set({
        slip: slipId,
      })
      .returning({ queue: endgameSubmissions.queue, id: endgameSubmissions.id })
      .where(eq(endgameSubmissions.id, sid));
  });
  revalidatePath("/rubgram/admin");
  ps.publish({}, { topic: "rubgram", event: "update" });
  return Array.isArray(queue) ? queue[0] : queue;
}

async function checkSlip(
  buffer: Buffer<ArrayBuffer>,
  type: string,
  amount: number,
): Promise<SlipokResponse> {
  const response = await fetch(SLIPOK_API_URL, {
    method: "POST",
    headers: {
      "x-authorization": SLIPOK_API_KEY,
    },
    body: (() => {
      const formData = new FormData();
      formData.append("files", new Blob([buffer], { type }), image.name);
      formData.append("amount", amount.toString());
      // formData.append("log", "true"); // no log cause im logging myself
      return formData;
    })(),
  });

  const data = await response.json();

  // if (!response.ok) throw data;
  return data;
}

// discord auth
export async function getDiscordSession() {
  const c = await cookies();
  const token = c.get("discord");
  if (!token) return undefined;
  return await db
    .select()
    .from(endgameDiscord)
    .where(eq(endgameDiscord.token, token.value))
    .then((v) => v[0]);
}

export async function loginDiscord() {
  redirect(process.env.DISCORD_OAUTH_URL!);
}

export async function calcPrice(service: string[]) {
  const { free, count, types, allDiscount } = await getEndgameConfig();
  return count < free
    ? 0
    : service.reduce(
        (p, s) => p + (types.find((t) => t.id === s)?.price || 0),
        0,
      ) - (types.every((s) => service.includes(s.id)) ? allDiscount : 0);
}

async function removeExpiredSubmissions() {
  // First, get count of items to be removed
  const expiredCond = and(
    not(eq(endgameSubmissions.price, 0)),
    isNull(endgameSubmissions.slip),
    lt(endgameSubmissions.expires, new Date()),
  );
  const toRemove = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(endgameSubmissions)
    .where(expiredCond);

  // Delete expired submissions and update queue numbers in one transaction
  await db.transaction(async (tx) => {
    // Store the queue numbers before deletion
    const expiredQueues = await tx
      .select()
      .from(endgameSubmissions)
      .where(expiredCond)
      .orderBy(desc(endgameSubmissions.queue));

    // Delete expired submissions
    if (expiredQueues.length)
      await tx.insert(endgameArchive).values(expiredQueues);
    await tx.delete(endgameSubmissions).where(expiredCond);

    // Update queue numbers for remaining submissions
    for (const { queue } of expiredQueues) {
      await tx
        .update(endgameSubmissions)
        .set({
          queue: sql`${endgameSubmissions.queue} - 1`,
        })
        .where(gt(endgameSubmissions.queue, queue));
    }

    // Reset the serial sequence to the max queue number
    const maxQueue = await tx
      .select({ max: sql<number>`MAX(${endgameSubmissions.queue})` })
      .from(endgameSubmissions);

    const nextSerial = (maxQueue[0]?.max || 0) + 1;

    // Update the sequence - adjust schema name if needed
    await tx.execute(
      sql`SELECT setval('endgame.submissions_queue_seq', ${nextSerial}, false)`,
    );
  });

  return {
    removed: Number(toRemove[0]?.count || 0),
  };
}

export async function cancel(sid: string) {
  await db.delete(endgameSubmissions).where(eq(endgameSubmissions.id, sid));

  await removeExpiredSubmissions();

  revalidatePath("/rubgram");
}

export async function discordCall(id: string) {
  return await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify({
      content: `<@${id}> ถึงคิวแล้ว ทักหาบุสได้เลย`,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  }).then(async (r) => {
    console.log(await r.text());
    return r.ok;
  });
}

export type SlipokResponse =
  | {
      success: true;
      data: {
        success: true;
        message: string;
        rqUID: string;
        language: string;
        transRef: string;
        sendingBank: string;
        receivingBank: string;
        transDate: string;
        transTime: string;
        sender: {
          displayName: string;
          name: string;
          proxy: {
            type: null;
            value: null;
          };
          account: {
            type: string;
            value: string;
          };
        };
        receiver: {
          displayName: string;
          name: string;
          proxy: {
            type: string;
            value: string;
          };
          account: {
            type: string;
            value: string;
          };
        };
        amount: number;
        paidLocalAmount: number;
        paidLocalCurrency: string;
        countryCode: string;
        transFeeAmount: number;
        ref1: string;
        ref2: string;
        ref3: string;
        toMerchantId: string;
      };
    }
  | {
      success: false;
      code: number;
      message: string;
    };
