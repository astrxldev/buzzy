import { getArtifactCardImage } from "$lib/server/data";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const result = await getArtifactCardImage(params.sub);
  const headers = new Headers();
  for (const [key, value] of Object.entries(result.headers ?? {})) {
    if (value) headers.set(key, value);
  }
  return new Response(result.body, {
    status: result.status,
    headers,
  });
};
