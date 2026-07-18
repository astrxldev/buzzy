import { getCdnAdminData } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return { files: await getCdnAdminData() };
};
