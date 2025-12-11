import { ps } from "@/lib/db/redis";

export async function GET() {
  return ps.new("rubgram");
}
