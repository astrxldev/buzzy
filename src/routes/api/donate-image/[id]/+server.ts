import { error } from "@sveltejs/kit";
import { getDonationImage } from "$lib/server/data";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const image = await getDonationImage(params.id);
  if (!image) error(404, "Donation image not found");
  return new Response(image, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=300",
    },
  });
};
