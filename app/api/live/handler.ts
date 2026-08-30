export type YoutubeLiveInfo =
  | {
      url: string;
      thumbnails: { url: string; width: number; height: number };
      title: string;
    }
  | "none";

type SearchResponse = {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      thumbnails: Record<
        string,
        { url: string; width: number; height: number }
      >;
    };
  }>;
};

type LiveDependencies = {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  publish: (live: Exclude<YoutubeLiveInfo, "none">) => unknown;
  getConfig: () => { apiKey?: string; channelId?: string };
  logError?: (message: string) => void;
};

export function createLiveHandler({
  fetch,
  publish,
  getConfig,
  logError = console.error,
}: LiveDependencies) {
  let lastResponse: Response | undefined;

  return async function GET(request: Request) {
    const url = new URL(request.url);
    if (url.searchParams.has("last") && lastResponse)
      return lastResponse.clone();

    const { apiKey, channelId } = getConfig();
    if (!apiKey || !channelId) return Response.json("none");

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&eventType=live&type=video&maxResults=1&key=${encodeURIComponent(apiKey)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      logError(`YouTube API error: ${response.statusText}`);
      return Response.json("none");
    }

    const data: SearchResponse = await response.json();
    if (data.items.length === 0) return Response.json("none");

    const live = data.items[0];
    const thumbnail = Object.values(live.snippet.thumbnails)[0];
    if (!thumbnail) return Response.json("none");

    const result: Exclude<YoutubeLiveInfo, "none"> = {
      url: `https://www.youtube.com/watch?v=${live.id.videoId}`,
      thumbnails: thumbnail,
      title: live.snippet.title,
    };
    publish(result);
    lastResponse = Response.json(result);
    return lastResponse.clone();
  };
}
