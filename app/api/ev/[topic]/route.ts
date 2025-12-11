import { adminCheck } from "@/lib/auth";
import { ps } from "@/lib/db/redis";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ topic: string }> },
) {
  if (!(await adminCheck()))
    return new Response("Unauthorized", { status: 401 });
  const { topic } = await params;
  return ps.new(topic);
}
