import { fail } from "@sveltejs/kit";
import {
  cancelRubgramSubmission,
  getRubgramPageData,
  submitRubgramPayment,
  submitRubgramRegistration,
} from "$lib/server/data";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
  return await getRubgramPageData(
    cookies.get("rsid"),
    cookies.get("discord"),
    url.searchParams.has("new"),
  );
};

export const actions: Actions = {
  registration: async ({ request, cookies }) => {
    const result = await submitRubgramRegistration(await request.formData());
    if ("error" in result) return fail(400, { error: result.error });
    cookies.set("rsid", result.id, {
      httpOnly: false,
      path: "/rubgram",
      sameSite: "lax",
      secure: false,
    });
    return { success: true };
  },
  payment: async ({ request }) => {
    const result = await submitRubgramPayment(await request.formData());
    if ("error" in result) return fail(400, { error: result.error });
    return { success: true };
  },
  cancel: async ({ request, cookies }) => {
    const formData = await request.formData();
    const sid = String(formData.get("sid") || "");
    if (!sid) return fail(400, { error: "ไม่พบคิวที่ต้องการยกเลิก" });
    await cancelRubgramSubmission(sid);
    cookies.delete("rsid", { path: "/rubgram" });
    return { success: true };
  },
  select: async ({ request, cookies }) => {
    const formData = await request.formData();
    const sid = String(formData.get("sid") || "");
    if (!sid) return fail(400, { error: "ไม่พบคิว" });
    cookies.set("rsid", sid, {
      httpOnly: false,
      path: "/rubgram",
      sameSite: "lax",
      secure: false,
    });
    return { success: true };
  },
};
