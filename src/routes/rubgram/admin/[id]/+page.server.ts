import { error } from "@sveltejs/kit";
import { getRubgramSubmissionDetail } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const detail = await getRubgramSubmissionDetail(params.id);
  if (!detail) error(404, "Submission not found");
  return detail;
};
