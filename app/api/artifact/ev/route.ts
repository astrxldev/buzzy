import { notFound } from "next/navigation";
import { apiAuthCheck } from "@/lib/auth";
import { sse } from "@/lib/utils";

export async function GET() {
  if (!apiAuthCheck()) return notFound();
  return sse.new("artifact-ev");
}
