import { error, redirect } from "@sveltejs/kit";
import { adminCheck } from "@/lib/auth";
import { getTierlistConfig } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, request }) => {
  if (!(await adminCheck(request.headers))) redirect(302, "/login");
  const config = await getTierlistConfig(params.type, params.ver);
  if (!config) error(404, "Tierlist not found");
  return { ...config, editable: true };
};
