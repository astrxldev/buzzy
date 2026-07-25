import type { RequestHandler } from "./$types";

type LiveResponse = { url: string } | "none";

export const GET: RequestHandler = async ({ request }) => {
  const liveUrl = new URL("https://buzz.sudloh.com/api/live", request.url).toString();
  const response = await fetch(liveUrl, { cache: "no-store" });
  if (!response.ok) return new Response("Failed to get live stream.", { status: 502 });

  const liveInfo = (await response.json()) as LiveResponse;
  if (liveInfo === "none") {
    return new Response("No live stream found for this channel.", { status: 404 });
  }

  const videoId = new URL(liveInfo.url).searchParams.get("v");
  if (!videoId) {
    return new Response("Live stream video id was not found.", { status: 502 });
  }

  return Response.redirect(
    `https://studio.youtube.com/live_chat?is_popout=1&v=${videoId}`,
    307,
  );
};
