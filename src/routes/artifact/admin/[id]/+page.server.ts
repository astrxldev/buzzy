import { error } from "@sveltejs/kit";
import { getArtifactSubmissionDetail } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const detail = await getArtifactSubmissionDetail(params.id);
  if (!detail) error(404, "Submission not found");
  return detail;
};
