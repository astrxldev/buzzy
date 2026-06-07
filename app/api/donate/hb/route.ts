import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { fileToDataUrl } from "@/lib/utils";
import { and, asc, not, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
  const tag = Number(req.nextUrl.searchParams.get("tag") ?? "abc");
  if (Number.isNaN(tag))
    return Response.json({ error: "Invalid Tag" }, { status: 400 });

  queueMicrotask(async () => {
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
    sse.donate.pub("ping", {
      ...havent,
      message: havent.message ?? "",
      image: havent.image
        ? await fileToDataUrl(new File([Buffer.from(havent.image)], "abc.jpeg"))
        : undefined,
    });
  });

  sse.donate.pub("heartbeat", tag);
  return Response.json({ success: true });
}
