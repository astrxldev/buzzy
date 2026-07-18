import { error } from "@sveltejs/kit";
import { command, getRequestEvent } from "$app/server";
import { z } from "zod";
import { adminCheck } from "@/lib/auth";
import { toggleGuideHidden } from "$lib/server/data";

async function requireAdmin() {
  const event = getRequestEvent();
  const user = await adminCheck(event.request.headers);
  if (!user) error(401, "Unauthorized");
  return user;
}

export const toggleGuide = command(z.string(), async (id) => {
  const user = await requireAdmin();
  return await toggleGuideHidden(id, user.name);
});
