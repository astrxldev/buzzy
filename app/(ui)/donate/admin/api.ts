"use server";

import { eq } from "drizzle-orm";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { donations, settings } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { getPostHogClient } from "@/lib/posthog-server";
import { fileToDataUrl } from "@/lib/utils";
import {
  getDonationImage,
  publishTestPopup,
  reloadDonationWidget,
  resendDonationPopup,
  resetDonationGoal,
} from "./service";

function commonDependencies() {
  return {
    isAdmin: adminCheck,
    capture: (
      event: Parameters<ReturnType<typeof getPostHogClient>["capture"]>[0],
    ) => getPostHogClient().capture(event),
    publish: (event: "update" | "ping" | "refresh", data: unknown) => {
      if (event === "update") return sse.donate.pub(event, data as null);
      if (event === "refresh") return sse.donate.pub(event, data as null);
      return sse.donate.pub(
        event,
        data as Parameters<typeof sse.donate.pub<"ping">>[1],
      );
    },
  };
}

export async function resetGoal() {
  return resetDonationGoal({
    ...commonDependencies(),
    now: () => new Date(),
    async resetGoal(at) {
      await db
        .insert(settings)
        .values({ donateGoalStarting: at })
        .onConflictDoUpdate({
          target: settings.id,
          set: { donateGoalStarting: at },
        });
    },
  });
}

export async function testPopup() {
  return publishTestPopup(commonDependencies());
}

export async function reloadWidget() {
  return reloadDonationWidget(commonDependencies());
}

export async function resendPopup(id: string) {
  return resendDonationPopup(id, {
    ...commonDependencies(),
    async resetSent(donationId) {
      const [donation] = await db
        .update(donations)
        .set({ sent: false })
        .where(eq(donations.id, donationId))
        .returning();
      return donation;
    },
    imageToDataUrl: (image) =>
      fileToDataUrl(new File([Buffer.from(image)], "abc.jpeg")),
  });
}

export async function getImage(id: string) {
  const image = await getDonationImage(id, {
    isAdmin: adminCheck,
    async findImage(donationId) {
      const [donation] = await db
        .select({ image: donations.image })
        .from(donations)
        .where(eq(donations.id, donationId));
      return donation?.image;
    },
  });
  return new Blob([Buffer.from(image)], { type: "image/jpeg" });
}
