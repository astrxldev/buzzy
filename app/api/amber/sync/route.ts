import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { syncAmber } from "@/util/sync";

export async function GET() {
  if (!(await adminCheck()))
    return new Response("Unauthorized", { status: 401 });
  await syncAmber();
  await actionLog("Triggered an Amber sync from API");
  return new Response(
    "OK(log is wip, check `kubectl logs -fn buzz deployments/app`)",
  );
}
