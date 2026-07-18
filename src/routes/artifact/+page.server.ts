import { fail } from "@sveltejs/kit";
import {
  getArtifactPageData,
  submitArtifactForm,
} from "$lib/server/data";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
  return await getArtifactPageData(
    cookies.get("sid"),
    url.searchParams.get("edit"),
  );
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const editSub = formData.get("editSub");
    const editToken = formData.get("editToken");
    const edit =
      typeof editSub === "string" && typeof editToken === "string"
        ? { sub: editSub, token: editToken }
        : undefined;

    const result = await submitArtifactForm(formData, edit);
    if ("error" in result) return fail(400, { error: result.error });

    cookies.set("sid", result.id, {
      httpOnly: false,
      path: "/artifact",
      sameSite: "lax",
      secure: false,
    });

    return { success: true, queue: result.queue };
  },
};
