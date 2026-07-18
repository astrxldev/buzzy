import { error } from "@sveltejs/kit";
import { getTierlistConfig } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const config = await getTierlistConfig(params.type, params.ver);
  if (!config) error(404, "Tierlist not found");
  return { ...config, editable: false };
};
