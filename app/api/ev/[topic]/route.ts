import { apiAuthCheck } from "@/lib/auth";
import { sse } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ topic: string }> },
) {
  if (!(await apiAuthCheck()))
    return new Response("Unauthorized", { status: 401 });
  const { topic } = await params;
  return sse.new(topic);
}
