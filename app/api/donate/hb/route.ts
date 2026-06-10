import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { fileToDataUrl } from "@/lib/utils";
import { and, asc, not, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";

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

export async function PATCH(req: NextRequest) {
  const tag = Number(req.nextUrl.searchParams.get("tag") ?? "abc");
  const resume = req.nextUrl.searchParams.get("resume") === "true";
  if (Number.isNaN(tag))
    return Response.json({ error: "Invalid Tag" }, { status: 400 });

  if (!resume) queueMicrotask(runResume);

  sse.donate.pub("heartbeat", tag);
  if (resume) {
    const res = await runResume();
    if (res) return Response.json(res, { status: 302 });
  }
  return Response.json({ success: true });
}
