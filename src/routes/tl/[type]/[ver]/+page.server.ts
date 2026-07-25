import { error } from "@sveltejs/kit";
import { adminCheck } from "@/lib/auth-core";
import { getTierlistConfig } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, request }) => {
  const config = await getTierlistConfig(params.type, params.ver);
  if (!config) error(404, "Tierlist not found");
  return {
    ...config,
    editable: false,
    canEdit: !!(await adminCheck(request.headers)),
  };
};
