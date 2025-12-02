import { sse } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ver: string }> },
) {
  const { ver } = await params;
  return sse.new(`tl-${ver}`);
}
