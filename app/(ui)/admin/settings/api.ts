"use server";

import { exec } from "node:child_process";
import { env } from "node:process";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { actionLog } from "@/lib/api";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export async function getEnka() {
  const [{ enka } = { enka: true }] = await db.select().from(settings).limit(1);
  return enka;
}

export async function toggleEnka(state: boolean) {
  const last = await getEnka();
  if (last === state) return;
  await db
    .insert(settings)
    .values({ enka: state })
    .onConflictDoUpdate({ target: settings.id, set: { enka: state } });

  actionLog("Changed a settings", { enka: state });
  revalidatePath("/admin/settings");
  revalidatePath("/artifact");
}

export async function syncAmber() {
  const res = await promisify(exec)("bun util/sync 2>&1", {
    env: { ...env, NO_AUTH_CHECK: "1" },
  });
  actionLog("Triggered an Amber sync", { result: res.stdout });
  return res.stdout;
}
