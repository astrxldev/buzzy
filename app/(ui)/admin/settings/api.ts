"use server";

import { revalidatePath } from "next/cache";
import type { ToastType } from "@/components/fake-toast";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db, primaryDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { getSlipConfiguration, isSlipProvider } from "@/lib/slip-checker";
import { syncAmber as syncAmberRaw } from "@/util/sync";

export async function getSettongs() {
  if (!(await adminCheck())) throw "Unauthorized";
  const [
    settangs = {
      enka: true,
      donatePromptpay: true,
      donateTruemoney: true,
      slipCheckProvider: "slipok" as const,
    },
  ] = await primaryDb.select().from(settings).limit(1);
  return settangs;
}

export async function setSlipCheckProvider(provider: string) {
  if (!(await adminCheck())) throw "Unauthorized";
  if (!isSlipProvider(provider))
    return { success: false as const, message: "บริการตรวจสอบสลิปไม่ถูกต้อง" };
  try {
    getSlipConfiguration(provider);
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "การตั้งค่าไม่ถูกต้อง",
    };
  }
  await primaryDb
    .insert(settings)
    .values({ slipCheckProvider: provider })
    .onConflictDoUpdate({
      target: settings.id,
      set: { slipCheckProvider: provider },
    });
  await actionLog("Changed slip verification provider", { provider });
  revalidatePath("/admin/settings");
  return { success: true as const, provider };
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

export async function broadcastMessage(
  prefix: string,
  value: string,
  type: ToastType,
) {
  "use server";

  sse.active.pub("announcement", {
    severity: type,
    message: value,
    prefix,
  });

  await actionLog("Broadcasted message", { prefix, value, type });
}
