import { getAmberVh } from "$lib/server/api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () =>
  new Response(
    await fetch(
      `https://gi.yatta.moe/api/v2/static/changelog?vh=${await getAmberVh()}`,
    ).then((response) => response.text()),
    { headers: { "Content-Type": "application/json" } },
  );
