import { and, asc, not, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { getPostHogClient } from "@/lib/posthog-server";
import { fileToDataUrl } from "@/lib/utils";
import type { RequestHandler } from "./$types";

async function runResume() {
  const [pending] = await db
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
  if (!pending) return;

  getPostHogClient().capture({
    distinctId: String(pending.id),
    event: "donation_resent",
    properties: { donation_id: pending.id, amount: pending.amount },
  });
  const result = {
    ...pending,
    message: pending.message ?? "",
    image: pending.image
      ? await fileToDataUrl(new File([Buffer.from(pending.image)], "abc.jpeg"))
      : undefined,
  };
  sse.donate.pub("ping", result);
  return result;
}

export const PATCH: RequestHandler = async ({ url }) => {
  const tag = Number(url.searchParams.get("tag") ?? "abc");
  const resume = url.searchParams.get("resume") === "true";
  if (Number.isNaN(tag)) {
    return Response.json({ error: "Invalid Tag" }, { status: 400 });
  }

  if (!resume) queueMicrotask(runResume);
  sse.donate.pub("heartbeat", tag);
  if (resume) {
    const result = await runResume();
    if (result) return Response.json(result, { status: 302 });
  }
  return Response.json({ success: true });
};
