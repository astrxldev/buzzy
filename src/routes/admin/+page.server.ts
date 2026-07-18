import { getAdminDashboardData } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return await getAdminDashboardData();
};
