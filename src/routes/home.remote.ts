import { query } from "$app/server";
import { getPublicStats } from "$lib/server/data";

export const getStats = query(async () => {
  return await getPublicStats();
});
