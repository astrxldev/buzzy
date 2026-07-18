import { redirect } from "@sveltejs/kit";
import { adminCheck } from "@/lib/auth";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ request, url }) => {
  if (!(await adminCheck(request.headers))) {
    redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  }
  return {};
};
