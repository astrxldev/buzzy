import { fail } from "@sveltejs/kit";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  getArtifactPageData,
  submitArtifactForm,
} from "$lib/server/data";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const [pageData, characterData] = await Promise.all([
    getArtifactPageData(cookies.get("sid"), url.searchParams.get("edit")),
    db
      .select({
        label: characters.name,
        value: characters.name,
        amber: characters.amber,
        image: characters.image,
      })
      .from(characters)
      .orderBy(characters.name),
  ]);
  return { ...pageData, characters: characterData };
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

    if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
      getPostHogClient().capture({
        distinctId: result.id,
        event: "artifact_submitted",
        properties: {
          character: formData.get("character")?.toString(),
          is_edit: !!edit,
        },
      });
    }

    cookies.set("sid", result.id, {
      httpOnly: false,
      path: "/artifact",
      sameSite: "lax",
      secure: false,
    });

    return { success: true, queue: result.queue };
  },
};
