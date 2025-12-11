import { ps } from "@/lib/db/redis";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ver: string }> },
) {
  const { ver } = await params;
  return ps.new(`tl.${ver}`);
}
