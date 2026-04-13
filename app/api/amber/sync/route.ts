import { exec } from "node:child_process";
import { env } from "node:process";
import { promisify } from "node:util";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";

export async function GET() {
  if (!(await adminCheck()))
    return new Response("Unauthorized", { status: 401 });
  const res = await promisify(exec)("bun util/sync 2>&1", {
    env: { ...env, NO_AUTH_CHECK: "1" },
  });
  await actionLog("Triggered an Amber sync from API", { result: res.stdout });
  return new Response(res.stdout);
}
