type LiveResponse = { url: string } | "none";

type Fetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function createChatHandler({ fetch }: { fetch: Fetch }) {
  return async function GET(request: Request) {
    const liveUrl = new URL(
      "https://buzz.sudloh.com/api/live",
      request.url,
    ).toString();
    const response = await fetch(liveUrl, { cache: "no-store" });

    if (!response.ok)
      return new Response("Failed to get live stream.", { status: 502 });

    const liveInfo: LiveResponse = await response.json();
    if (liveInfo === "none")
      return new Response("No live stream found for this channel.", {
        status: 404,
      });

    let videoId: string | null = null;
    try {
      videoId = new URL(liveInfo.url).searchParams.get("v");
    } catch {}

    if (!videoId)
      return new Response("Live stream video id was not found.", {
        status: 502,
      });

    return Response.redirect(
      `https://studio.youtube.com/live_chat?is_popout=1&v=${encodeURIComponent(videoId)}`,
      307,
    );
  };
}
