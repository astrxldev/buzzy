import { redirect } from "@sveltejs/kit";
import { getRubgramCalendarData } from "$lib/server/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const data = await getRubgramCalendarData(url.searchParams.get("month") ?? undefined);
  if (!data) redirect(303, "/rubgram/admin/calendar");
  return data;
};
