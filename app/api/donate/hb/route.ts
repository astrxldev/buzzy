import { and, asc, not, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { requireWidgetCredential } from "@/app/(ui)/donate/service";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { getPostHogClient } from "@/lib/posthog-server";
import { fileToDataUrl } from "@/lib/utils";
import { createDonateHeartbeatHandler } from "./handler";

async function runResume() {
  const [havent] = await db
    .select()
    .from(donations)
    .where(
      and(
        not(donations.sent),
        sql`${donations.lastPing} < NOW() - INTERVAL '2 minutes'`,
      ),
    )
    .limit(1)
    .orderBy(asc(donations.id));
  if (!havent) return;
  getPostHogClient().capture({
    distinctId: String(havent.id),
    event: "donation_resent",
    properties: { donation_id: havent.id, amount: havent.amount },
  });
  const result = {
    ...havent,
    message: havent.message ?? "",
    image: havent.image
      ? await fileToDataUrl(new File([Buffer.from(havent.image)], "abc.jpeg"))
      : undefined,
  };
  sse.donate.pub("ping", result);
  return result;
}

const handler = createDonateHeartbeatHandler({
  authorize: (credential) =>
    requireWidgetCredential(credential, process.env.DONATE_WIDGET_KEY),
  resumeDonation: runResume,
  publishHeartbeat: (tag) => sse.donate.pub("heartbeat", tag),
  queue: queueMicrotask,
});

export function PATCH(req: NextRequest) {
  return handler(req);
}
