import { sse } from "@/lib/utils";

export async function GET() {
  return sse.new("artifact-ev");
}
