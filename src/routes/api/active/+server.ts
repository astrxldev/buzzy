import { sse } from "@/lib/db/sse-endpoints";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const version = Bun.file(".version");
  const ver = (await version.exists()) ? (await version.text()).trim() : "DEV";
  return (
    (await sse.active.stream({
      motd: { data: ver || "DEV", event: "version" },
      signal: request.signal,
    })) ?? new Response("SSE is unavailable", { status: 503 })
  );
};
