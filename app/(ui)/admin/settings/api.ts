"use server";

import { revalidatePath } from "next/cache";
import { actionLog } from "@/lib/api";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { adminCheck } from "@/lib/auth";
import { sse } from "@/lib/db/sse-endpoints";
import { syncAmber as syncAmberRaw } from "@/util/sync";

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
  await syncAmberRaw();
  await actionLog("Triggered an Amber sync", {
    result: "OK(log is wip, check `kubectl logs -fn buzz deployments/app`)",
  });
  return "OK(log is wip, check `kubectl logs -fn buzz deployments/app`)";
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
