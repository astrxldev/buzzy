import { error } from "@sveltejs/kit";
import { getTierlistSelection } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const types = await getTierlistSelection(params.type);
  if (!types.length) error(404, "Tierlist type not found");
  return { type: types[0] };
};
