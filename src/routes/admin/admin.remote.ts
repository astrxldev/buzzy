import { exec } from "node:child_process";
import { promisify } from "node:util";
import { error } from "@sveltejs/kit";
import { command, getRequestEvent } from "$app/server";
import { and, eq, inArray, not } from "drizzle-orm";
import { z } from "zod";
import { adminCheck } from "@/lib/auth-core";
import { db } from "@/lib/db";
import { cdnReferences } from "@/lib/db/references";
import {
  cdn,
  characters,
  guides,
  settings,
  tierlistTypes,
  tierlistVersions,
} from "@/lib/db/schema";
import { writeAuditLog } from "$lib/server/api";

async function requireAdmin() {
  const event = getRequestEvent();
  const user = await adminCheck(event.request.headers);
  if (!user) error(401, "Unauthorized");
  return user;
}

function optionalId(value?: string | null) {
  return value?.trim() || null;
}

function databaseMessage(reason: unknown) {
  const cause = (reason as { cause?: { detail?: string; message?: string } })?.cause;
  return cause?.detail || cause?.message || (reason instanceof Error ? reason.message : "Database operation failed");
}

async function insertCdnFile(file: File) {
  if (!file.size) error(400, "File is empty");
  const [created] = await db
    .insert(cdn)
    .values({
      data: Buffer.from(await file.arrayBuffer()),
      name: file.name || null,
      size: String(file.size),
      type: file.type || "application/octet-stream",
    })
    .returning();
  return created;
}

export const uploadCdn = command("unchecked", async (input: { files: File[] }) => {
  const user = await requireAdmin();
  if (!input.files.length) error(400, "Choose at least one file");
  const created = [];
  for (const file of input.files) {
    const uploaded = await insertCdnFile(file);
    created.push(uploaded);
    await writeAuditLog(`Uploaded CDN file ${uploaded.name || uploaded.id}`, uploaded, user.name);
  }
  return created;
});

export const importCdn = command(z.array(z.url()).min(1).max(20), async (urls) => {
  const user = await requireAdmin();
  const created = [];
  for (const url of urls) {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) error(400, `Failed to fetch ${url}: ${response.status}`);
    const disposition = response.headers.get("content-disposition");
    const encodedName = new URL(response.url).pathname.split("/").pop();
    const name =
      disposition?.match(/filename="?([^";]+)"?/i)?.[1] ||
      (encodedName ? decodeURIComponent(encodedName) : "download");
    const file = new File([await response.blob()], name, {
      type: response.headers.get("content-type") || "application/octet-stream",
    });
    const imported = await insertCdnFile(file);
    created.push(imported);
    await writeAuditLog(`Imported CDN file ${imported.name || imported.id}`, { url, file: imported }, user.name);
  }
  return created;
});

export const renameCdn = command(
  z.object({ id: z.string().min(1), name: z.string().trim().min(1) }),
  async ({ id, name }) => {
    const user = await requireAdmin();
    const [file] = await db.update(cdn).set({ name }).where(eq(cdn.id, id)).returning();
    if (!file) error(404, "File not found");
    await writeAuditLog(`Renamed CDN file to "${name}"`, { id }, user.name);
    return { ok: true };
  },
);

export const deleteCdn = command(z.array(z.string()).min(1), async (ids) => {
  const user = await requireAdmin();
  const result = await db.transaction(async (tx) => {
    const refs = await tx.select().from(cdnReferences).where(inArray(cdnReferences.cdn, ids));
    if (refs.length) {
      return {
        blocked: refs.map((ref) => ({
          id: ref.cdn,
          reference: `${ref.table}.${ref.column}#${ref.id}`,
        })),
      };
    }
    const removed = await tx.delete(cdn).where(inArray(cdn.id, ids)).returning();
    return { removed };
  });
  if ("blocked" in result) return result;
  await writeAuditLog(`Deleted ${result.removed.length} CDN file(s)`, ids, user.name);
  return result;
});

const characterInput = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  version: z.string().trim().min(1),
  stars: z.union([z.literal(4), z.literal(5)]),
  vision: z.enum(["anemo", "geo", "dendro", "hydro", "pyro", "cryo", "electro"]),
  image: z.string().trim().min(1),
  weapon: z.string().trim().min(1),
  amber: z.string().trim().min(1),
  order: z.number().int(),
});

export const saveCharacter = command(
  z.object({ originalId: z.string().optional(), value: characterInput }),
  async ({ originalId, value }) => {
    const user = await requireAdmin();
    try {
      if (originalId) {
        const { id: _, ...update } = value;
        const [changed] = await db.update(characters).set(update).where(eq(characters.id, originalId)).returning();
        if (!changed) error(404, "Character not found");
        await writeAuditLog(`Edited character ${originalId}`, update, user.name);
      } else {
        await db.insert(characters).values(value);
        await writeAuditLog(`Created character ${value.id}`, value, user.name);
      }
    } catch (reason) {
      error(400, databaseMessage(reason));
    }
    return { ok: true };
  },
);

export const deleteCharacter = command(z.string(), async (id) => {
  const user = await requireAdmin();
  const [removed] = await db.delete(characters).where(eq(characters.id, id)).returning();
  if (!removed) error(404, "Character not found");
  await writeAuditLog(`Deleted character ${id}`, removed, user.name);
  return { ok: true };
});

const guideInput = z.object({
  name: z.string().trim().min(1),
  link: z.url(),
  image: z.string().nullable().optional(),
  order: z.number().int(),
  hidden: z.boolean().default(false),
});

export const saveGuide = command(
  z.object({ id: z.string().optional(), value: guideInput }),
  async ({ id, value }) => {
    const user = await requireAdmin();
    const normalized = { ...value, image: optionalId(value.image) };
    try {
      if (id) {
        const [changed] = await db.update(guides).set(normalized).where(eq(guides.id, id)).returning();
        if (!changed) error(404, "Guide not found");
        await writeAuditLog(`Updated guide ${normalized.name}`, normalized, user.name);
      } else {
        const [created] = await db.insert(guides).values(normalized).returning();
        await writeAuditLog(`Added guide ${normalized.name}`, created, user.name);
      }
    } catch (reason) {
      error(400, databaseMessage(reason));
    }
    return { ok: true };
  },
);

export const toggleGuide = command(z.string(), async (id) => {
  const user = await requireAdmin();
  const [changed] = await db
    .update(guides)
    .set({ hidden: not(guides.hidden) })
    .where(eq(guides.id, id))
    .returning();
  if (!changed) error(404, "Guide not found");
  await writeAuditLog("Toggled guide visibility", { id, hidden: changed.hidden }, user.name);
  return changed;
});

export const deleteGuide = command(z.string(), async (id) => {
  const user = await requireAdmin();
  const [removed] = await db.delete(guides).where(eq(guides.id, id)).returning();
  if (!removed) error(404, "Guide not found");
  await writeAuditLog(`Deleted guide ${id}`, removed, user.name);
  return { ok: true };
});

const tierlistTypeInput = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  image: z.string().nullable().optional(),
  order: z.number().int(),
  mode: z.string().trim().min(1),
});

export const saveTierlistType = command(
  z.object({ originalId: z.string().optional(), value: tierlistTypeInput }),
  async ({ originalId, value }) => {
    const user = await requireAdmin();
    const normalized = { ...value, image: optionalId(value.image) };
    try {
      if (originalId) {
        const { id: _, ...update } = normalized;
        const [changed] = await db.update(tierlistTypes).set(update).where(eq(tierlistTypes.id, originalId)).returning();
        if (!changed) error(404, "Tierlist type not found");
        await writeAuditLog(`Updated tierlist type ${originalId}`, update, user.name);
      } else {
        await db.insert(tierlistTypes).values(normalized);
        await writeAuditLog(`Created tierlist type ${value.id}`, normalized, user.name);
      }
    } catch (reason) {
      error(400, databaseMessage(reason));
    }
    return { ok: true };
  },
);

export const deleteTierlistType = command(z.string(), async (id) => {
  const user = await requireAdmin();
  const [removed] = await db.delete(tierlistTypes).where(eq(tierlistTypes.id, id)).returning();
  if (!removed) error(404, "Tierlist type not found");
  await writeAuditLog(`Deleted tierlist type ${id}`, removed, user.name);
  return { ok: true };
});

const tierlistVersionInput = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
  image: z.string().nullable().optional(),
  disclaimer: z.string().nullable().optional(),
  deprecates: z.string().trim().min(1),
  from: z.string().trim().min(1),
  order: z.number().int(),
  hidden: z.boolean().default(false),
});

export const saveTierlistVersion = command(
  z.object({ originalId: z.string().optional(), value: tierlistVersionInput }),
  async ({ originalId, value }) => {
    const user = await requireAdmin();
    const normalized = {
      ...value,
      image: optionalId(value.image),
      disclaimer: optionalId(value.disclaimer),
    };
    try {
      if (originalId) {
        const { id: _, ...update } = normalized;
        const [changed] = await db
          .update(tierlistVersions)
          .set(update)
          .where(and(eq(tierlistVersions.id, originalId), eq(tierlistVersions.type, value.type)))
          .returning();
        if (!changed) error(404, "Tierlist version not found");
        await writeAuditLog(`Updated tierlist version ${value.type}/${originalId}`, update, user.name);
      } else {
        await db.insert(tierlistVersions).values(normalized);
        await writeAuditLog(`Created tierlist version ${value.type}/${value.id}`, normalized, user.name);
      }
    } catch (reason) {
      error(400, databaseMessage(reason));
    }
    return { ok: true };
  },
);

export const deleteTierlistVersion = command(
  z.object({ id: z.string(), type: z.string() }),
  async ({ id, type }) => {
    const user = await requireAdmin();
    const [removed] = await db
      .delete(tierlistVersions)
      .where(and(eq(tierlistVersions.id, id), eq(tierlistVersions.type, type)))
      .returning();
    if (!removed) error(404, "Tierlist version not found");
    await writeAuditLog(`Deleted tierlist version ${type}/${id}`, removed, user.name);
    return { ok: true };
  },
);

export const setEnka = command(z.boolean(), async (enka) => {
  const user = await requireAdmin();
  await db
    .insert(settings)
    .values({ enka })
    .onConflictDoUpdate({ target: settings.id, set: { enka } });
  await writeAuditLog("Changed Enka setting", { enka }, user.name);
  return { enka };
});

export const syncAmber = command(async () => {
  const user = await requireAdmin();
  try {
    const result = await promisify(exec)("bun util/sync.ts 2>&1", {
      cwd: process.cwd(),
      env: { ...process.env, NO_AUTH_CHECK: "1" },
      maxBuffer: 4 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    });
    await writeAuditLog("Triggered an Amber sync", { result: result.stdout }, user.name);
    return { ok: true, output: result.stdout || "Amber sync completed." };
  } catch (reason) {
    const failure = reason as Error & { stdout?: string; stderr?: string };
    const output = failure.stdout || failure.stderr || failure.message;
    await writeAuditLog("Amber sync failed", { output }, user.name);
    return { ok: false, output };
  }
});
