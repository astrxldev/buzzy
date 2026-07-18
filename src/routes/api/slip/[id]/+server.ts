import { error } from "@sveltejs/kit";
import { getSlipImage } from "$lib/server/data";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const slip = await getSlipImage(params.id);
  if (!slip) error(404, "Slip not found");
  return new Response(slip, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
};
