import { exec } from "node:child_process";
import { env } from "node:process";
import { promisify } from "node:util";
import { adminCheck } from "@/lib/auth-core";
import { writeAuditLog } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const user = await adminCheck(request.headers);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const res = await promisify(exec)("bun util/sync 2>&1", {
    env: { ...env, NO_AUTH_CHECK: "1" },
  });
  await writeAuditLog(
    "Triggered an Amber sync from API",
    { result: res.stdout },
    user.name,
  );
  return new Response(res.stdout);
};
