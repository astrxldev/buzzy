import { getGuideAdminData } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return { guides: await getGuideAdminData() };
};
