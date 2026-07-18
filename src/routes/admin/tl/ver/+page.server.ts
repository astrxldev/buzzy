import { getTierlistAdminVersionsData } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return { types: await getTierlistAdminVersionsData() };
};
