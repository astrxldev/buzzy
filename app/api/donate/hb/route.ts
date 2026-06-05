import { sse } from "@/lib/db/sse-endpoints";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
  const tag = Number(req.nextUrl.searchParams.get("tag") ?? "abc");
  if (Number.isNaN(tag))
    return Response.json({ error: "Invalid Tag" }, { status: 400 });
  sse.donate.pub("heartbeat", tag);
  return Response.json({ success: true });
}
