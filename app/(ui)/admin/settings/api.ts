"use server";

import { revalidatePath } from "next/cache";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { syncAmber as syncAmberRaw } from "@/util/sync";
import { getSettingsService, updateSettingService } from "./service";

export async function getSettongs() {
  return getSettingsService(
    { enka: true, donatePromptpay: true, donateTruemoney: true },
    {
      adminCheck,
      read: async () =>
        (
          await db
            .select({
              enka: settings.enka,
              donatePromptpay: settings.donatePromptpay,
              donateTruemoney: settings.donateTruemoney,
            })
            .from(settings)
            .limit(1)
        )[0],
    },
  );
}

export async function toggleEnka(state: boolean) {
  return updateSettingService(state, {
    adminCheck,
    persist: async (value) => {
      await db
        .insert(settings)
        .values({ enka: value })
        .onConflictDoUpdate({ target: settings.id, set: { enka: value } });
    },
    afterPersist: async (value) => {
      await actionLog("Changed a settings", { enka: value });
      revalidatePath("/admin/settings");
      revalidatePath("/artifact");
    },
  });
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
  return updateSettingService(state, {
    adminCheck,
    persist: async (value) => {
      await db
        .insert(settings)
        .values({ [method]: value })
        .onConflictDoUpdate({
          target: settings.id,
          set: { [method]: value },
        });
    },
    afterPersist: async (value) => {
      await actionLog("Changed a settings", { [method]: value });
    },
  });
}
