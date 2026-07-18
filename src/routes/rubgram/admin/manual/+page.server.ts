import { getEndgameConfig } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const config = await getEndgameConfig();
  return { types: config.types };
};
