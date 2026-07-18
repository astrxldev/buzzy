import {
  and,
  between,
  count as sqlCount,
  desc,
  eq,
  getTableColumns,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  not,
  or,
  sql,
  sum,
} from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { uidRegex } from "@/lib/const";
import { db } from "@/lib/db";
import {
  artifactSettings,
  auditLog,
  cards,
  cdn,
  characters,
  donations,
  endgameDiscord,
  endgameExpired,
  endgameSettings,
  endgameSlips,
  endgameSubmissions,
  endgameTypes,
  guides,
  settings,
  submissions,
  tierlistBadges,
  tierlistColumns,
  tierlistStates,
  tierlistTiers,
  tierlistTypes,
  tierlistVersions,
  user as authUsers,
  versions,
  type Note,
} from "@/lib/db/schema";
import { sse, tlSse } from "@/lib/db/sse-endpoints";
import { checkSlip } from "@/lib/payment";
import type { SlipokResponse } from "@/lib/payment-types";

const { TMN_DEST_PHONE_NUM, SASTIFY_API_PRIVKEY } = process.env as Record<
  string,
  string | undefined
>;

export async function getPublicStats() {
  const [artifact, rubgram, donate] = await Promise.all([
    db.$count(submissions).catch(() => null),
    db
      .$count(endgameSubmissions, not(endgameSubmissions.deleted))
      .catch(() => null),
    db.$count(donations).catch(() => null),
  ]);

  return { artifact, rubgram, donate };
}

export async function searchGuides(search = "", admin = false) {
  return await db
    .select()
    .from(guides)
    .where(
      and(
        ilike(guides.name, `%${search}%`),
        admin ? undefined : not(guides.hidden),
      ),
    )
    .orderBy(desc(guides.order));
}

export async function getArtifactConfig() {
  const [art] = await db.select().from(artifactSettings).limit(1);
  const [glob] = await db.select().from(settings).limit(1);
  const defaults = { locked: false, limit: -1, enka: false };
  return { ...defaults, ...art, ...glob };
}

export async function getArtifactPageData(
  sid: string | undefined,
  editToken: string | null,
) {
  const [config, clist, countRows, existingRows] = await Promise.all([
    getArtifactConfig(),
    db
      .select({
        label: characters.name,
        value: characters.name,
      })
      .from(characters)
      .orderBy(characters.name),
    db
      .select({ count: sqlCount() })
      .from(submissions)
      .where(isNotNull(submissions.queue)),
    sid
      ? db.select().from(submissions).where(eq(submissions.id, sid)).limit(1)
      : Promise.resolve([]),
  ]);

  const submission = existingRows[0];
  const editing =
    !!submission &&
    editToken === submission.editToken &&
    submission.edits < 5 &&
    !submission.checked;

  return {
    clist,
    config,
    count: countRows[0]?.count ?? 0,
    editing,
    submission,
  };
}

const artifactSubmissionSchema = z.object({
  name: z.string().max(64, "ชื่อยาวเกินไป ต้องไม่เกิน 64 ตัวอักษร"),
  uid: z
    .string()
    .regex(uidRegex, "UID ไม่ถูกต้อง ต้องเป็นเลข 9 หรือ 10 หลัก เท่านั้น"),
  character: z.string().min(1, "เลือกตัวละครก่อน"),
  comment: z
    .string()
    .max(1024, "ข้อความเพิ่มเติมยาวเกินไป ต้องไม่เกิน 1024 ตัวอักษร")
    .default(""),
});

export async function submitArtifactForm(
  formData: FormData,
  edit?: { sub: string; token: string },
) {
  const config = await getArtifactConfig();
  if (config.locked) {
    return { error: "ปิดรับลงทะเบียนชั่วคราว เนื่องจากมีผู้ลงจำนวนมาก" };
  }

  const [{ count }] = await db
    .select({ count: sqlCount() })
    .from(submissions)
    .where(isNotNull(submissions.queue));
  if (!edit && config.limit !== -1 && count >= config.limit) {
    return { error: `คิวลงทะเบียนเต็มแล้ว (${config.limit} ครั้ง)` };
  }

  const parsed = await artifactSubmissionSchema.safeParseAsync(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const existingUid = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.uid, parsed.data.uid),
        edit ? not(eq(submissions.editToken, edit.token)) : undefined,
      ),
    )
    .limit(1);
  if (existingUid.length) return { error: "คุณลงทะเบียนไปแล้ว" };

  const character = await db
    .select({ name: characters.name })
    .from(characters)
    .where(eq(characters.name, parsed.data.character))
    .limit(1);
  if (!character.length) return { error: "ไม่พบตัวละครที่เลือก" };

  if (edit) {
    const [existing] = await db
      .delete(submissions)
      .where(
        and(
          eq(submissions.id, edit.sub),
          eq(submissions.editToken, edit.token),
          sql`${submissions.edits} < 5`,
          not(submissions.checked),
        ),
      )
      .returning();

    if (!existing) return { error: "คิวนี้แก้ไม่ได้แล้ว" };

    const [queue] = await db
      .insert(submissions)
      .values({
        name: parsed.data.name,
        uid: parsed.data.uid,
        comment: parsed.data.comment,
        char: parsed.data.character,
        queue: existing.queue,
        edits: existing.edits + 1,
        editToken: uuidv7(),
      })
      .returning();

    await db.delete(cards).where(eq(cards.submission, queue.id));
    sse.artifact.pub("update", { type: "submit" });
    return { ok: true, id: queue.id, queue: queue.queue };
  }

  const [queue] = await db
    .insert(submissions)
    .values({
      name: parsed.data.name,
      uid: parsed.data.uid,
      comment: parsed.data.comment,
      char: parsed.data.character,
    })
    .returning();

  sse.artifact.pub("update", { type: "submit" });
  return { ok: true, id: queue.id, queue: queue.queue };
}

type SastifyApiResponse =
  | {
      success: true;
      data: {
        amount: number;
        status: "SUCCESS";
      };
    }
  | {
      success: false;
      code?: string | number;
      message: string;
    };

const donationBaseSchema = z.object({
  name: z.string().max(50, "ชื่อยาวสุด 50 ตัวอักษร").default("Anonymous"),
  message: z.string().max(500, "ข้อความยาวสุด 500 ตัวอักษร").default(""),
  amount: z.coerce
    .number("จำนวนต้องเป็นตัวเลข")
    .min(1, "โดเนทขั้นต่ำ 1 บาท")
    .max(10000, "โดเนทได้ไม่เกิน 1 หมื่นบาท"),
  artifact: z.string().optional(),
  uid: z.string().optional(),
  type: z.enum(["tmn", "pp"]).default("tmn"),
  link: z.string().optional(),
});

export async function submitDonationForm(formData: FormData) {
  const parsed = donationBaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const data = parsed.data;
  const image = formData.get("image");
  const slip = formData.get("slip");
  const artifact = data.artifact === "true";

  if (artifact && !data.uid?.match(uidRegex)) {
    return { error: "รูปแบบ UID สำหรับลัดคิวไม่ถูกต้อง" };
  }

  if (data.type === "pp") {
    if (!(slip instanceof File) || slip.size === 0) {
      return { error: "อัพโหลดสลิปโอนเงินด้วย" };
    }
    const buffer = Buffer.from(await slip.arrayBuffer());
    const processed = await checkSlip(buffer, slip.type, data.amount);
    if (!processed.success) {
      return { error: `${processed.code}: ${processed.message}` };
    }

    const [check] = await db
      .insert(endgameSlips)
      .values({
        slip: buffer,
        amount: data.amount.toString(),
        data: processed,
        ref: processed.data.transRef,
      })
      .returning()
      .catch(() => [{ id: "conflict" }]);

    if (check.id === "conflict") return { error: "สลิปนี้ถูกใช้ไปแล้ว" };
  } else {
    if (!data.link) return { error: "ใส่ลิ้งค์อั่งเปา TrueMoney ก่อน" };
    if (!TMN_DEST_PHONE_NUM || !SASTIFY_API_PRIVKEY) {
      return { error: "ยังไม่ได้ตั้งค่า TrueMoney gateway" };
    }

    const res: SastifyApiResponse = await fetch(
      "https://api.sastify.xyz/v1/gateway/tmn",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${SASTIFY_API_PRIVKEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: data.amount,
          phone_number: TMN_DEST_PHONE_NUM,
          voucher_url: data.link,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    )
      .then((r) => r.json())
      .catch((e) => e);

    if (!res.success) return { error: res.message ?? "ชำระเงินไม่สำเร็จ" };
  }

  const imageBuffer =
    image instanceof File && image.size > 0
      ? await new Bun.Image(await image.arrayBuffer())
          .resize(512, 512)
          .webp()
          .toBuffer()
      : undefined;

  const [{ id }] = await db
    .insert(donations)
    .values({
      name: data.name || "Anonymous",
      amount: data.amount,
      message: data.message,
      image: imageBuffer,
      method: data.type,
      uid: artifact ? data.uid : null,
      sent: data.amount < 10,
    })
    .returning();

  if (artifact && data.uid) {
    await db
      .insert(submissions)
      .values({
        name: data.name || "Anonymous",
        comment: data.message,
        uid: data.uid,
        queue: null as unknown as undefined,
      })
      .onConflictDoUpdate({
        target: submissions.uid,
        set: {
          comment: sql`${submissions.comment} || ${"\n"}::text || ${data.message}::text`,
          promoted: true,
        },
      })
      .catch(console.error);
  }

  if (data.amount >= 10) {
    sse.donate.pub("ping", {
      id,
      name: data.name || "Anonymous",
      amount: data.amount,
      message: data.message,
      image:
        image instanceof File && image.size > 0
          ? await fileToDataUrl(image)
          : undefined,
    });
  } else {
    sse.donate.pub("update", null);
  }

  return { ok: true };
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

async function writeAuditLog(text: string, details?: unknown, author?: string) {
  const [entry] = await db
    .insert(auditLog)
    .values({ author, text, details })
    .returning()
    .catch((e) => {
      console.error("Error logging audit entry", e);
      return [];
    });
  if (entry) sse.log.pub("update", entry);
}

function rowsFromExecute<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export async function getArtifactAdminData() {
  const [rawSubs, config, countRows] = await Promise.all([
    db.execute(sql`
      WITH max_checked AS (
        SELECT MAX(queue) AS max_queue
        FROM artifact.submissions
        WHERE checked = TRUE
          AND queue IS NOT NULL
      )
      SELECT s.*
      FROM artifact.submissions s
      CROSS JOIN max_checked m
      ORDER BY
        CASE
          WHEN s.queue IS NULL AND s.checked = TRUE THEN -1
          WHEN s.queue IS NULL AND s.checked = FALSE THEN COALESCE(m.max_queue, 0)::numeric + 0.5
          ELSE s.queue
        END,
        s.id;
    `),
    getArtifactConfig(),
    db
      .select({ count: sqlCount() })
      .from(submissions)
      .where(isNotNull(submissions.queue)),
  ]);

  return {
    config,
    count: countRows[0]?.count ?? 0,
    subs: rowsFromExecute<typeof submissions.$inferSelect>(rawSubs),
  };
}

export async function getArtifactSubmissionDetail(id: string) {
  const [[sub], config] = await Promise.all([
    db.select().from(submissions).where(eq(submissions.id, id)).limit(1),
    getArtifactConfig(),
  ]);
  if (!sub) return null;

  const [char] = sub.char
    ? await db.select().from(characters).where(eq(characters.name, sub.char)).limit(1)
    : [];

  return { sub, char, config };
}

export async function toggleArtifactCheck(id: string, author?: string) {
  await db
    .update(submissions)
    .set({ checked: not(submissions.checked) })
    .where(eq(submissions.id, id));
  sse.artifact.pub("update", { type: "toggleCheck" });
  await writeAuditLog("Toggled an artifact submission check mark", { id }, author);
  return { ok: true };
}

export async function toggleArtifactLock(author?: string) {
  const existing = await db
    .update(artifactSettings)
    .set({ locked: not(artifactSettings.locked) })
    .returning();
  if (existing.length === 0) {
    await db.insert(artifactSettings).values({ locked: true });
  }
  sse.artifact.pub("update", { type: "toggleLock" });
  await writeAuditLog("Toggled artifact submission lock", undefined, author);
  return { ok: true, locked: existing[0]?.locked ?? true };
}

export async function setArtifactLimit(limit: number, author?: string) {
  const normalized = Number.isFinite(limit) ? Math.trunc(limit) : -1;
  const existing = await db
    .update(artifactSettings)
    .set({ limit: normalized })
    .returning();
  if (existing.length === 0) {
    await db.insert(artifactSettings).values({ limit: normalized });
  }
  sse.artifact.pub("update", { type: "setLimit" });
  await writeAuditLog("Set artifact submission limit", { limit: normalized }, author);
  return { ok: true, limit: normalized };
}

export async function wipeArtifactSubmissions(author?: string) {
  await db.delete(submissions);
  await db.execute(sql`ALTER SEQUENCE artifact.submissions_queue_seq RESTART WITH 1`);
  sse.artifact.pub("update", { type: "wipe" });
  await writeAuditLog("Deleted artifact submissions", undefined, author);
  return { ok: true };
}

export async function randomArtifactSubmission() {
  const [sub] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(not(submissions.checked))
    .orderBy(sql`RANDOM()`)
    .limit(1);
  return sub ?? null;
}

export async function revalidateArtifactCard(id: string, author?: string) {
  await db.delete(cards).where(eq(cards.submission, id));
  await writeAuditLog("Revalidated artifact card", { id }, author);
  return { ok: true };
}

export async function getArtifactCardImage(id: string) {
  const [[sub], [image]] = await Promise.all([
    db.select().from(submissions).where(eq(submissions.id, id)).limit(1),
    db.select().from(cards).where(eq(cards.submission, id)).limit(1),
  ]);
  if (!sub) return { status: 404, body: "Submission not found" } as const;
  if (image?.image) {
    return {
      status: 200,
      body: new Uint8Array(image.image),
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    } as const;
  }

  const [char] = sub.char
    ? await db.select().from(characters).where(eq(characters.name, sub.char)).limit(1)
    : [];
  if (!char) return { status: 500, body: `Unknown character: ${sub.char}` } as const;

  const card = await fetch(
    `https://api.astrxl.dev/v1/card/genshin/${sub.uid}/${char.amber.split("-")[0]}?lang=th&substat=true&quality=true`,
  );
  if (!card.ok) {
    await db
      .insert(cards)
      .values({
        error: await card.text().catch(() => card.statusText),
        submission: id,
        tries: 1,
      })
      .onConflictDoUpdate({
        target: cards.submission,
        set: {
          error: card.statusText,
          tries: sql`${cards.tries} + 1`,
        },
      });
    return {
      status: card.status,
      body: card.statusText,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    } as const;
  }

  const fresh = Buffer.from(await card.arrayBuffer());
  await db
    .insert(cards)
    .values({ image: fresh, submission: id, error: null })
    .onConflictDoUpdate({
      target: cards.submission,
      set: { image: fresh, error: null, tries: sql`${cards.tries} + 1` },
    });

  return {
    status: 200,
    body: new Uint8Array(fresh),
    headers: { "Content-Type": card.headers.get("Content-Type") ?? "image/png" },
  } as const;
}

export async function getCardStatus(submissionId: string) {
  const [res] = await db
    .select({
      cached: sql<boolean>`${isNotNull(cards.image)}`,
      error: cards.error,
    })
    .from(cards)
    .where(eq(cards.submission, submissionId))
    .limit(1);
  return res ?? { cached: false, error: null };
}

export async function getRubgramAdminData() {
  const [subs, config] = await Promise.all([
    db
      .select({
        id: endgameSubmissions.id,
        name: endgameSubmissions.name,
        checked: endgameSubmissions.checked,
        publicQueue: sql<number>`
          ${endgameSubmissions.queue} - (
            SELECT COUNT(*)::int
            FROM ${endgameSubmissions} e2
            WHERE (e2.checked AND e2.queue < endgame.submissions.queue)
               OR e2.deleted
          )
        `,
        paid: endgameSubmissions.paid,
        deleted: endgameSubmissions.deleted,
      })
      .from(endgameSubmissions)
      .orderBy(endgameSubmissions.deleted, endgameSubmissions.id),
    getEndgameConfig(),
  ]);

  return { subs, config };
}

export async function getRubgramSubmissionDetail(id: string) {
  const [[sub], types] = await Promise.all([
    db.select().from(endgameSubmissions).where(eq(endgameSubmissions.id, id)).limit(1),
    db.select().from(endgameTypes).orderBy(endgameTypes.order),
  ]);
  if (!sub) return null;
  const [[discord], [slip]] = await Promise.all([
    db.select().from(endgameDiscord).where(eq(endgameDiscord.uid, sub.user)).limit(1),
    sub.slip
      ? db
          .select({
            id: endgameSlips.id,
            ref: endgameSlips.ref,
            amount: endgameSlips.amount,
            data: endgameSlips.data,
          })
          .from(endgameSlips)
          .where(eq(endgameSlips.id, sub.slip))
          .limit(1)
      : Promise.resolve([]),
  ]);
  const typeNames = Object.fromEntries(types.map((type) => [type.id, type.display]));
  return { sub, discord, slip, typeNames };
}

export async function toggleRubgramCheck(id: string, author?: string) {
  await db
    .update(endgameSubmissions)
    .set({ checked: not(endgameSubmissions.checked) })
    .where(eq(endgameSubmissions.id, id));
  sse.rubgram.pub("update", { type: "toggleCheck" });
  await writeAuditLog("Toggled a rubgram submission check mark", { id }, author);
  return { ok: true };
}

export async function toggleRubgramLock(author?: string) {
  const existing = await db
    .update(endgameSettings)
    .set({ locked: not(endgameSettings.locked) })
    .returning();
  if (existing.length === 0) {
    await db.insert(endgameSettings).values({ locked: true });
  }
  sse.rubgram.pub("update", { type: "toggleLock" });
  await writeAuditLog("Toggled rubgram submission lock", undefined, author);
  return { ok: true, locked: existing[0]?.locked ?? true };
}

export async function setRubgramLimit(limit: number, author?: string) {
  const normalized = Number.isFinite(limit) ? Math.trunc(limit) : -1;
  const existing = await db
    .update(endgameSettings)
    .set({ limit: normalized })
    .returning();
  if (existing.length === 0) {
    await db.insert(endgameSettings).values({ limit: normalized });
  }
  sse.rubgram.pub("update", { type: "setLimit" });
  await writeAuditLog("Set rubgram submission limit", { limit: normalized }, author);
  return { ok: true, limit: normalized };
}

export async function setRubgramFree(free: number, author?: string) {
  const normalized = Number.isFinite(free) ? Math.max(0, Math.trunc(free)) : 0;
  const existing = await db
    .update(endgameSettings)
    .set({ free: normalized })
    .returning();
  if (existing.length === 0) {
    await db.insert(endgameSettings).values({ free: normalized });
  }
  sse.rubgram.pub("update", { type: "setFree" });
  await writeAuditLog("Set rubgram free submission amount", { free: normalized }, author);
  return { ok: true, free: normalized };
}

export async function wipeRubgramSubmissions(author?: string) {
  await db.update(endgameSubmissions).set({ deleted: true });
  sse.rubgram.pub("update", { type: "wipe" });
  await writeAuditLog("Deleted rubgram submissions", undefined, author);
  return { ok: true };
}

export async function randomRubgramSubmission() {
  const [sub] = await db
    .select({ id: endgameSubmissions.id })
    .from(endgameSubmissions)
    .where(and(endgameSubmissions.paid.getSQL(), not(endgameSubmissions.deleted)))
    .orderBy(sql`${endgameSubmissions.checked} ASC, RANDOM()`)
    .limit(1);
  return sub ?? null;
}

export async function bulkDeleteRubgram(ids: string[], author?: string) {
  if (!ids.length) return { ok: true };
  await db
    .update(endgameSubmissions)
    .set({ deleted: true })
    .where(inArray(endgameSubmissions.id, ids));
  sse.rubgram.pub("update", { type: "wipe" });
  await writeAuditLog("Bulk deleted rubgram submissions", { ids }, author);
  return { ok: true };
}

export async function addRubgramNote(id: string, text: string, author?: string) {
  const note: Note = {
    id: uuidv7(),
    text,
    createdAt: new Date().toISOString(),
  };
  const [sub] = await db
    .select({ notes: endgameSubmissions.notes })
    .from(endgameSubmissions)
    .where(eq(endgameSubmissions.id, id))
    .limit(1);
  await db
    .update(endgameSubmissions)
    .set({ notes: [...(sub?.notes || []), note] })
    .where(eq(endgameSubmissions.id, id));
  sse.rubgram.pub("update", { type: "toggleCheck" });
  await writeAuditLog("Added rubgram note", { id }, author);
  return note;
}

export async function deleteRubgramNote(id: string, noteId: string, author?: string) {
  const [sub] = await db
    .select({ notes: endgameSubmissions.notes })
    .from(endgameSubmissions)
    .where(eq(endgameSubmissions.id, id))
    .limit(1);
  await db
    .update(endgameSubmissions)
    .set({ notes: (sub?.notes || []).filter((note) => note.id !== noteId) })
    .where(eq(endgameSubmissions.id, id));
  sse.rubgram.pub("update", { type: "toggleCheck" });
  await writeAuditLog("Deleted rubgram note", { id, noteId }, author);
  return { ok: true };
}

export async function callRubgramDiscord(id: string) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return { ok: false, error: "DISCORD_WEBHOOK_URL is not configured" };
  const res = await fetch(webhook, {
    method: "POST",
    body: JSON.stringify({
      content: `<@${id}> ถึงคิวแล้ว ทักหาบุส <@681741453382123521> ได้เลย`,
      allowed_mentions: { users: [id] },
    }),
    headers: { "Content-Type": "application/json" },
  });
  return { ok: res.ok, status: res.status };
}

export async function debugUploadRubgramSlip(id: string, slip: File, author?: string) {
  if (!slip.size) return { error: "กรุณาอัพโหลดสลิปให้ครบถ้วน" };
  const buffer = Buffer.from(await slip.arrayBuffer());
  const [createdSlip] = await db
    .insert(endgameSlips)
    .values({
      slip: buffer,
      ref: `debug-${uuidv7()}`,
      amount: "0",
      data: {
        success: true,
        data: { transRef: `debug-${uuidv7()}`, amount: 0, status: "SUCCESS" },
      } as unknown as SlipokResponse,
    })
    .returning();
  const slipId = createdSlip.id;
  await db
    .update(endgameSubmissions)
    .set({ slip: slipId })
    .where(eq(endgameSubmissions.id, id));
  sse.rubgram.pub("update", { type: "uploadSlip" });
  await writeAuditLog("Debug-uploaded rubgram slip", { id, slipId }, author);
  return { ok: true, slipId };
}

export async function createManualRubgramSubmission(
  input: {
    name: string;
    price: number;
    services: string[];
    server: "as" | "eu" | "us" | "tw";
    discord: string;
    username: string;
    display: string;
    slip?: File | null;
  },
  author?: string,
) {
  if (!input.name.trim()) return { error: "Name is required" };
  if (!input.discord.match(/^\d{17,20}$/)) return { error: "Discord ID is invalid" };
  if (!input.services.length) return { error: "Select at least one service" };

  const types = await db.select({ id: endgameTypes.id }).from(endgameTypes);
  const validTypes = new Set(types.map((type) => type.id));
  if (input.services.some((service) => !validTypes.has(service))) {
    return { error: "Service is invalid" };
  }

  let slipId: string | undefined;
  if (input.slip?.size) {
    const ref = `MANUAL-${uuidv7()}`;
    const [createdSlip] = await db
      .insert(endgameSlips)
      .values({
        slip: Buffer.from(await input.slip.arrayBuffer()),
        amount: `${input.price}`,
        ref,
        data: {
          success: true,
          data: { transRef: ref, amount: input.price, status: "SUCCESS" },
        } as unknown as SlipokResponse,
      })
      .returning();
    slipId = createdSlip.id;
  }

  await db
    .insert(endgameDiscord)
    .values({
      uid: input.discord,
      display: input.display || input.username || input.discord,
      username: input.username || input.discord,
    })
    .onConflictDoUpdate({
      target: endgameDiscord.uid,
      set: {
        display: input.display || input.username || input.discord,
        username: input.username || input.discord,
      },
    });

  const [sub] = await db
    .insert(endgameSubmissions)
    .values({
      name: input.name,
      price: Math.max(0, Math.trunc(input.price || 0)),
      server: input.server,
      service: input.services,
      slip: slipId,
      user: input.discord,
    })
    .returning();

  sse.rubgram.pub("update", { type: "submit", sub: sub.id });
  await writeAuditLog("Manually added rubgram submission", { id: sub.id }, author);
  return { ok: true, id: sub.id };
}

export async function getRubgramCalendarData(monthParam?: string) {
  const date = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  const { slip: _slipColumn, ...slipColumns } = getTableColumns(endgameSlips);
  const [rows, [config]] = await Promise.all([
    db
      .select({
        ...getTableColumns(endgameSubmissions),
        discord: getTableColumns(endgameDiscord),
        slipInfo: slipColumns,
      })
      .from(endgameSubmissions)
      .where(between(endgameSubmissions.submit_day, from, to))
      .leftJoin(endgameDiscord, eq(endgameDiscord.uid, endgameSubmissions.user))
      .leftJoin(endgameSlips, eq(endgameSlips.id, endgameSubmissions.slip))
      .orderBy(endgameSubmissions.submit_day, endgameSubmissions.queue),
    db.select({ monthly: endgameSettings.monthly }).from(endgameSettings).limit(1),
  ]);
  return {
    date,
    rows,
    total: rows.reduce((total, row) => total + row.price, 0),
    monthly: config?.monthly ?? {},
  };
}

export async function toggleRubgramMonth(month: string, author?: string) {
  const [settingsRow] = await db
    .select({ monthly: endgameSettings.monthly })
    .from(endgameSettings)
    .limit(1);
  const monthly = {
    ...(settingsRow?.monthly ?? {}),
    [month]: !(settingsRow?.monthly?.[month] ?? false),
  };
  await db
    .insert(endgameSettings)
    .values({ monthly })
    .onConflictDoUpdate({
      target: endgameSettings.id,
      set: { monthly },
    });
  await writeAuditLog("Toggled rubgram monthly accounting state", { month }, author);
  return { ok: true, checked: monthly[month] };
}

export async function getSlipImage(id: string) {
  const [row] = await db
    .select({ slip: endgameSlips.slip })
    .from(endgameSlips)
    .where(eq(endgameSlips.id, id))
    .limit(1);
  return row?.slip ? new Uint8Array(row.slip) : null;
}

export async function getDonationAdminData() {
  const { image: _image, ...donationColumns } = getTableColumns(donations);
  const [rows, [stats]] = await Promise.all([
    db
      .select({
        ...donationColumns,
        hasImage: sql<boolean>`${donations.image} IS NOT NULL`,
      })
      .from(donations)
      .limit(100)
      .orderBy(desc(donations.created)),
    db
      .select({
        total: sum(donations.amount).mapWith(Number),
        today: sql<number>`
          COALESCE(
            SUM(${donations.amount}) FILTER (
              WHERE ${donations.created} >= NOW() - INTERVAL '24 hours'
            ),
            0
          )
        `,
      })
      .from(donations)
      .limit(1),
  ]);
  return {
    rows,
    stats: {
      total: stats?.total ?? 0,
      today: stats?.today ?? 0,
    },
  };
}

export async function resendDonationPopup(id: string, author?: string) {
  const [donation] = await db
    .update(donations)
    .set({ sent: false })
    .where(eq(donations.id, id))
    .returning();
  if (!donation) return { error: "not found" };

  sse.donate.pub("ping", {
    ...donation,
    message: donation.message ?? "",
    image: donation.image
      ? await fileToDataUrl(new File([Buffer.from(donation.image)], "donation.jpeg"))
      : undefined,
  });
  await writeAuditLog("Resent donation popup", { id }, author);
  return { ok: true };
}

export async function testDonationPopup(author?: string) {
  sse.donate.pub("ping", {
    id: "test",
    name: "Mr. Buzz",
    message: "นี่คือข้อความทดสอบโดเนท",
    amount: 67,
  });
  await writeAuditLog("Sent donation test popup", undefined, author);
  return { ok: true };
}

export async function reloadDonationWidget(author?: string) {
  sse.donate.pub("refresh", null);
  await writeAuditLog("Reloaded donation widgets", undefined, author);
  return { ok: true };
}

export async function resetDonationGoal(author?: string) {
  await db
    .insert(settings)
    .values({ donateGoalStarting: new Date() })
    .onConflictDoUpdate({
      target: settings.id,
      set: { donateGoalStarting: new Date() },
    });
  sse.donate.pub("update", null);
  await writeAuditLog("Reset donation goal", undefined, author);
  return { ok: true };
}

export async function setDonationGoal(goal: number | null, author?: string) {
  const normalized = goal === null || !Number.isFinite(goal) ? null : Math.max(0, goal);
  await db
    .insert(settings)
    .values({ donateGoal: normalized })
    .onConflictDoUpdate({
      target: settings.id,
      set: { donateGoal: normalized },
    });
  sse.donate.pub("update", null);
  await writeAuditLog("Set donation goal", { goal: normalized }, author);
  return { ok: true, goal: normalized };
}

export async function getDonationGoalData() {
  const [row] = await db.select({ donateGoal: settings.donateGoal }).from(settings).limit(1);
  return { donateGoal: row?.donateGoal ?? null };
}

export async function getDonationImage(id: string) {
  const [row] = await db
    .select({ image: donations.image })
    .from(donations)
    .where(eq(donations.id, id))
    .limit(1);
  return row?.image ? new Uint8Array(row.image) : null;
}

export async function getDonationModeratorData() {
  const { image: _image, ...donationColumns } = getTableColumns(donations);
  const [latest] = await db
    .select({
      ...donationColumns,
      hasImage: sql<boolean>`${donations.image} IS NOT NULL`,
    })
    .from(donations)
    .orderBy(desc(donations.created))
    .limit(1);
  return { latest };
}

export async function rejectLatestDonation(id: string, author?: string) {
  await db.update(donations).set({ sent: true }).where(eq(donations.id, id));
  sse.donate.pub("refresh", null);
  await writeAuditLog("Rejected donation popup", { id }, author);
  return { ok: true };
}

export async function getAdminShellData() {
  const [versionsList, tlVersions] = await Promise.all([
    db.select().from(versions).orderBy(desc(versions.id)).catch(() => []),
    db
      .select({
        name: sql<string>`${tierlistTypes.name} || ' ' || ${tierlistVersions.name}`.as(
          "name",
        ),
        url: sql<string>`${tierlistVersions.type} || '/' || ${tierlistVersions.id}`,
      })
      .from(tierlistVersions)
      .orderBy(tierlistTypes.order, tierlistVersions.order)
      .innerJoin(tierlistTypes, eq(tierlistTypes.id, tierlistVersions.type))
      .catch(() => []),
  ]);
  return { versions: versionsList, tierlists: tlVersions };
}

export async function getAdminDashboardData() {
  const [artifactCount, rubgramCount, donationStats, guideCount, charCount, cdnCount] =
    await Promise.all([
      db.$count(submissions).catch(() => 0),
      db.$count(endgameSubmissions, not(endgameSubmissions.deleted)).catch(() => 0),
      getDonationAdminData().then((data) => data.stats).catch(() => ({ total: 0, today: 0 })),
      db.$count(guides).catch(() => 0),
      db.$count(characters).catch(() => 0),
      db.$count(cdn).catch(() => 0),
    ]);
  return {
    artifactCount,
    rubgramCount,
    donationStats,
    guideCount,
    charCount,
    cdnCount,
  };
}

export async function getAuditLogData() {
  const rawLogs = await db.execute(sql`
    SELECT *
    FROM (
      SELECT *
      FROM ${auditLog}
      ORDER BY ${auditLog.id} DESC
      LIMIT 1000
    ) t
    ORDER BY id ASC;
  `);
  const users = await db.select({ name: authUsers.name, email: authUsers.email }).from(authUsers);
  return {
    logs: rowsFromExecute<typeof auditLog.$inferSelect>(rawLogs),
    users,
  };
}

export async function getCharacterAdminData() {
  return await db
    .select()
    .from(characters)
    .orderBy(desc(characters.amber), characters.id);
}

export async function getGuideAdminData() {
  return await searchGuides("", true);
}

export async function toggleGuideHidden(id: string, author?: string) {
  await db
    .update(guides)
    .set({ hidden: not(guides.hidden) })
    .where(eq(guides.id, id));
  await writeAuditLog("Toggled guide visibility", { id }, author);
  return { ok: true };
}

export async function getCdnAdminData() {
  return await db
    .select({ id: cdn.id, name: cdn.name, type: cdn.type, size: cdn.size })
    .from(cdn)
    .orderBy(cdn.name);
}

export async function getTierlistAdminVersionsData() {
  const [types, versionRows] = await Promise.all([
    db.select().from(tierlistTypes).orderBy(tierlistTypes.id),
    db.select().from(tierlistVersions).orderBy(desc(tierlistVersions.order)),
  ]);
  return types.map((type) => ({
    ...type,
    versions: versionRows.filter((version) => version.type === type.id),
  }));
}

export async function getSettingsAdminData() {
  const [globalSettings, artifactConfig, rubgramConfig] = await Promise.all([
    db.select().from(settings).limit(1).then((rows) => rows[0] ?? null),
    getArtifactConfig(),
    getEndgameConfig(),
  ]);
  return { globalSettings, artifactConfig, rubgramConfig };
}

export async function getEndgameConfig() {
  const [ngm] = await db.select().from(endgameSettings).limit(1);
  const [glob] = await db.select().from(settings).limit(1);
  const [{ count }] = await db
    .select({ count: sqlCount() })
    .from(endgameSubmissions)
    .where(not(endgameSubmissions.deleted));
  const types = await db
    .select()
    .from(endgameTypes)
    .orderBy(endgameTypes.order);
  const defaults = {
    locked: false,
    limit: -1,
    enka: false,
    free: 0,
    allDiscount: 10,
    count,
    full: false,
    types,
  };
  const merged = { ...defaults, ...ngm, ...glob, count, types };
  return {
    ...merged,
    full: merged.limit !== -1 && count >= (merged.limit || 0),
  };
}

export async function getDiscordSession(token: string | undefined) {
  if (!token) return undefined;
  return await db
    .select()
    .from(endgameDiscord)
    .where(eq(endgameDiscord.token, token))
    .then((v) => v[0]);
}

export async function getUserSubmissions(uid: string) {
  const types = await db.select().from(endgameTypes);
  const typeNames = Object.fromEntries(types.map((t) => [t.id, t.display]));

  const subs = await db
    .select({
      id: endgameSubmissions.id,
      queue: endgameSubmissions.queue,
      name: endgameSubmissions.name,
      server: endgameSubmissions.server,
      price: endgameSubmissions.price,
      paid: endgameSubmissions.paid,
      checked: endgameSubmissions.checked,
      deleted: endgameSubmissions.deleted,
      expires: endgameSubmissions.expires,
      service: endgameSubmissions.service,
      submitDay: endgameSubmissions.submit_day,
    })
    .from(endgameSubmissions)
    .where(
      and(eq(endgameSubmissions.user, uid), not(endgameSubmissions.deleted)),
    )
    .orderBy(desc(endgameSubmissions.submit_day))
    .limit(20);

  return subs.map((s) => ({
    ...s,
    services: s.service.map((id) => typeNames[id] || id),
  }));
}

export async function getRubgramPageData(
  rsid: string | undefined,
  discordToken: string | undefined,
  isNew: boolean,
) {
  const session = await getDiscordSession(discordToken);
  const [q] =
    !isNew && rsid
      ? await db
          .select({
            id: endgameSubmissions.id,
            queue: sql<number>`
              ${endgameSubmissions.queue} - (
                select count(*)
                from ${endgameSubmissions} e2
                where e2.checked = true
                  and e2.queue < endgame.submissions.queue
              )
            `,
            paid: endgameSubmissions.paid,
            price: endgameSubmissions.price,
            expires: endgameSubmissions.expires,
          })
          .from(endgameSubmissions)
          .where(
            and(
              or(
                eq(endgameSubmissions.id, rsid),
                and(
                  eq(endgameSubmissions.user, session?.uid || "placeholder"),
                  gt(endgameSubmissions.expires, new Date()),
                ),
              ),
              not(endgameSubmissions.deleted),
            ),
          )
      : [];

  const [userSubs, config, canExpireRows] = await Promise.all([
    session ? getUserSubmissions(session.uid) : Promise.resolve([]),
    getEndgameConfig(),
    q
      ? db
          .select({ queue: endgameSubmissions.queue })
          .from(endgameSubmissions)
          .where(
            and(
              not(endgameSubmissions.paid),
              lt(endgameSubmissions.queue, q.queue),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    canExpire: !!canExpireRows[0],
    config,
    q,
    session,
    userSubs,
  };
}

export async function calcRubgramPrice(service: string[]) {
  const { free, types, allDiscount } = await getEndgameConfig();
  return free > 0
    ? 0
    : service.reduce(
        (p, s) => p + (types.find((t) => t.id === s)?.price || 0),
        0,
      ) - (types.every((s) => service.includes(s.id)) ? allDiscount : 0);
}

export async function removeExpiredRubgramSubmissions() {
  const expiredCond = and(
    not(endgameSubmissions.paid),
    lt(endgameSubmissions.expires, new Date()),
  );
  await db.transaction(async (tx) => {
    const expiredQueues = await tx
      .select()
      .from(endgameSubmissions)
      .where(expiredCond)
      .orderBy(desc(endgameSubmissions.queue));
    if (expiredQueues.length) await tx.insert(endgameExpired).values(expiredQueues);
    await tx.delete(endgameSubmissions).where(expiredCond);
    for (const { queue } of expiredQueues) {
      await tx
        .update(endgameSubmissions)
        .set({ queue: sql`${endgameSubmissions.queue} - 1` })
        .where(gt(endgameSubmissions.queue, queue));
    }
    const maxQueue = await tx
      .select({ max: sql<number>`MAX(${endgameSubmissions.queue})` })
      .from(endgameSubmissions);
    await tx.execute(
      sql`SELECT setval('endgame.submissions_queue_seq', ${(maxQueue[0]?.max || 0) + 1}, false)`,
    );
  });
}

export async function submitRubgramRegistration(formData: FormData) {
  const { full, locked, limit, types, free } = await getEndgameConfig();
  const name = String(formData.get("name") || "");
  const server = String(formData.get("server") || "") as "as" | "eu" | "us" | "tw";
  const service = formData.getAll("service").map(String);
  const user = String(formData.get("user") || "");

  if (!name || !server || !service.length || !user) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }
  if (!["as", "eu", "us", "tw"].includes(server)) {
    return { error: "เซิร์ฟไม่ถูกต้อง" };
  }
  if (service.some((s) => !types.map((t) => t.id).includes(s))) {
    return { error: "บริการไม่ถูกต้อง" };
  }
  if (name.length > 32) {
    return { error: "ชื่อยาวเกินไป ต้องไม่เกิน 32 ตัวอักษร" };
  }
  if (locked) {
    return { error: "ปิดรับลงทะเบียนชั่วคราว เนื่องจากมีผู้ลงจำนวนมาก" };
  }
  if (full) return { error: `คิวลงทะเบียนเต็มแล้ว (${limit} ครั้ง)` };

  await removeExpiredRubgramSubmissions();
  const [existing] = await db
    .select({ queue: endgameSubmissions.queue, id: endgameSubmissions.id })
    .from(endgameSubmissions)
    .where(
      and(
        eq(endgameSubmissions.user, user),
        not(endgameSubmissions.deleted),
        not(endgameSubmissions.checked),
        not(endgameSubmissions.paid),
      ),
    )
    .limit(1);
  if (existing) return { ok: true, ...existing };

  const [queue] = await db
    .insert(endgameSubmissions)
    .values({
      user,
      name,
      server,
      service,
      price: await calcRubgramPrice(service),
    })
    .returning();

  if (free > 0) {
    await db.update(endgameSettings).set({
      free: sql`${endgameSettings.free} - 1`,
    });
  }

  sse.rubgram.pub("update", { type: "submit", sub: queue.id });
  return { ok: true, id: queue.id, queue: queue.queue };
}

export async function submitRubgramPayment(formData: FormData) {
  const sid = String(formData.get("sid") || "");
  const slip = formData.get("slip");
  if (!sid || !(slip instanceof File) || slip.size === 0) {
    return { error: "กรุณาอัพโหลดสลิปให้ครบถ้วน" };
  }

  const buffer = Buffer.from(await slip.arrayBuffer());

  const queue = await db.transaction(async (tx) => {
    const [s] = await tx
      .select()
      .from(endgameSubmissions)
      .where(
        and(eq(endgameSubmissions.id, sid), not(endgameSubmissions.deleted)),
      )
      .limit(1);
    const [a] = await tx
      .select()
      .from(endgameExpired)
      .where(eq(endgameExpired.id, sid))
      .limit(1);
    if (!s) {
      if (a) {
        await tx.insert(endgameSubmissions).values({
          ...a,
          price: await calcRubgramPrice(a.service),
        });
      } else {
        return { error: "คุณยังไม่ได้ลงทะเบียน" };
      }
    }

    const target = s || a;
    const processed = await checkSlip(buffer, slip.type, target.price);
    if (!processed.success) {
      return { error: `${processed.code}: ${processed.message}` };
    }

    const [{ id: slipId }] = await tx
      .insert(endgameSlips)
      .values({
        slip: buffer,
        ref: processed.data.transRef,
        amount: processed.data.amount?.toString(),
        data: processed,
      })
      .returning()
      .catch(() => [{ id: "conflict" }]);

    if (slipId === "conflict") return { error: "สลิปนี้ถูกใช้ไปแล้ว" };

    const [updated] = await tx
      .update(endgameSubmissions)
      .set({ slip: slipId })
      .where(eq(endgameSubmissions.id, sid))
      .returning();

    return { ok: true, id: updated.id, queue: updated.queue };
  });

  if ("ok" in queue && queue.id) {
    sse.rubgram.pub("update", { type: "paid", sub: queue.id });
  }
  return queue;
}

export async function cancelRubgramSubmission(sid: string) {
  await db
    .update(endgameSubmissions)
    .set({ deleted: true })
    .where(eq(endgameSubmissions.id, sid));
  sse.rubgram.pub("update", { type: "cancel" });
  return { ok: true };
}

export async function getTierlistSelection(typeId?: string) {
  const query = db
    .select({
      ...getTableColumns(tierlistTypes),
      versions: sql<(typeof tierlistVersions.$inferSelect)[]>`
        COALESCE(
          json_agg(
            json_build_object(
              'id', ${tierlistVersions.id},
              'name', ${tierlistVersions.name},
              'image', ${tierlistVersions.image}
            ) ORDER BY ${tierlistVersions.order} DESC)
          FILTER (WHERE ${tierlistVersions.id} IS NOT NULL),
          '[]'
        )
      `.as("versions"),
    })
    .from(tierlistTypes)
    .leftJoin(
      tierlistVersions,
      and(
        eq(tierlistVersions.type, tierlistTypes.id),
        not(tierlistVersions.hidden),
      ),
    )
    .groupBy(tierlistTypes.id)
    .orderBy(tierlistTypes.id);

  return typeId ? await query.where(eq(tierlistTypes.id, typeId)) : await query;
}

export async function getTierlistConfig(type: string, ver: string) {
  const config = await db.transaction(async (tx) => {
    const [version] = await tx
      .select()
      .from(tierlistVersions)
      .where(
        and(eq(tierlistVersions.type, type), eq(tierlistVersions.id, ver)),
      );
    if (!version) return;
    const [typeInfo] = await tx
      .select()
      .from(tierlistTypes)
      .where(eq(tierlistTypes.id, type));

    const vers = await tx
      .select({ id: versions.id, from: versions.from })
      .from(versions);
    const ids: string[] = [];
    let cur: string | null = version.from;
    while (cur) {
      ids.push(cur);
      const r = vers.find((v) => v.id === cur);
      cur = r?.from ?? null;
    }

    const chars =
      ids.length > 0
        ? await tx
            .select()
            .from(characters)
            .where(inArray(characters.version, ids))
            .orderBy(characters.order)
        : [];

    const [tiers, columns, badgesList, states] = await Promise.all([
      tx.select().from(tierlistTiers).orderBy(tierlistTiers.order),
      tx.select().from(tierlistColumns).orderBy(tierlistColumns.order),
      tx
        .select()
        .from(tierlistBadges)
        .orderBy(tierlistBadges.order)
        .where(
          or(
            isNull(tierlistBadges.type),
            eq(tierlistBadges.type, version.type),
          ),
        ),
      tx
        .select()
        .from(tierlistStates)
        .where(eq(tierlistStates.list, version.id)),
    ]);

    const badges = badgesList.map((b) => ({
      ...b,
      tier: tiers.filter((t) => t.badges?.includes(b.id)).map((t) => t.id),
    }));

    return { type: typeInfo, version, tiers, columns, badges, chars, states };
  });

  return config;
}

export async function saveTierlistPlacements(
  list: string,
  placements: Record<string, string[]>,
) {
  const { untiered: _untiered, ...placementObj } = placements;
  await db
    .update(tierlistVersions)
    .set({ placements: placementObj })
    .where(eq(tierlistVersions.id, list));
  tlSse(list).pub("update_placements", placements);
  return { ok: true };
}

export async function saveTierlistState(
  data: Partial<typeof tierlistStates.$inferInsert>,
) {
  if (!data.ref || !data.list || !data.char) return { error: "invalid state" };
  const [existing] = await db
    .select()
    .from(tierlistStates)
    .where(
      or(
        eq(tierlistStates.uuid, `${data.uuid}`),
        and(eq(tierlistStates.ref, data.ref), eq(tierlistStates.list, data.list)),
      ),
    );
  if (existing) {
    await db
      .update(tierlistStates)
      .set(data)
      .where(eq(tierlistStates.uuid, existing.uuid));
  } else {
    await db.insert(tierlistStates).values(data as typeof tierlistStates.$inferInsert);
  }
  const states = await db
    .select()
    .from(tierlistStates)
    .where(eq(tierlistStates.list, data.list));
  tlSse(data.list).pub("update_states", states);
  return { ok: true, states };
}
