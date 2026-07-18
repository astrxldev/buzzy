"use server";

import { exec } from "node:child_process";
import { env } from "node:process";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { actionLog } from "@/lib/api";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { adminCheck } from "@/lib/auth";
import { sse } from "@/lib/db/sse-endpoints";

export async function getSettongs() {
  if (!(await adminCheck())) throw "Unauthorized";
  const [
    settangs = { enka: true, donatePromptpay: true, donateTruemoney: true },
  ] = await db.select().from(settings).limit(1);
  return settangs;
}

export async function toggleEnka(state: boolean) {
  if (!(await adminCheck())) throw "Unauthorized";
  await db
    .insert(settings)
    .values({ enka: state })
    .onConflictDoUpdate({ target: settings.id, set: { enka: state } });

  await actionLog("Changed a settings", { enka: state });
  revalidatePath("/admin/settings");
  revalidatePath("/artifact");
}

export async function syncAmber() {
  if (!(await adminCheck())) throw "Unauthorized";
  const res = await promisify(exec)("bun util/sync 2>&1", {
    env: { ...env, NO_AUTH_CHECK: "1" },
  });
  await actionLog("Triggered an Amber sync", { result: res.stdout });
  return res.stdout;
}

export async function forceRefresh(prefix: string | null = null) {
  if (!(await adminCheck())) throw "Unauthorized";
  sse.active.pub("refresh", prefix);

  await actionLog("Pulled a force refresh");
}

export async function toggleDonatePaymentMethod(
  method: "donatePromptpay" | "donateTruemoney",
  state: boolean,
) {
  if (!(await adminCheck())) throw "Unauthorized";
  await db
    .insert(settings)
    .values({ [method]: state })
    .onConflictDoUpdate({ target: settings.id, set: { [method]: state } });

  await actionLog("Changed a settings", { [method]: state });
}
