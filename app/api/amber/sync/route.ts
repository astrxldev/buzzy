import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { createAmberSyncHandler } from "@/lib/server-handlers";
import { syncAmber } from "@/util/sync";

export const GET = createAmberSyncHandler({
  adminCheck,
  sync: syncAmber,
  log: actionLog,
});
