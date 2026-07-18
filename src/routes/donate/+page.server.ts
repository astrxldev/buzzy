import { fail } from "@sveltejs/kit";
import {
  getArtifactConfig,
  submitDonationForm,
} from "$lib/server/data";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return {
    artifactConfig: await getArtifactConfig(),
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const result = await submitDonationForm(await request.formData());
    if ("error" in result) return fail(400, { error: result.error });
    return { success: true };
  },
};
