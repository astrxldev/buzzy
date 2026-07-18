import { redirect } from "@sveltejs/kit";
import { adminCheck } from "@/lib/auth";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, url }) => {
  const next = url.searchParams.get("next") || "/admin";
  if (await adminCheck(request.headers)) redirect(303, next);
  return { next };
};
