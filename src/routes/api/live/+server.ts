import { sse } from "@/lib/db/sse-endpoints";
import type { YoutubeLiveInfo } from "@/lib/youtube-types";
import type { RequestHandler } from "./$types";

type APISearchResource = {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: Record<string, { url: string; width: number; height: number }>;
  };
};

type APISearchResponse = { items: APISearchResource[] };

const headers = {
  "Cache-Control": "public, s-maxage=900, stale-while-revalidate",
};

export const GET: RequestHandler = async () => {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey || !channelId) {
    return Response.json("none" satisfies YoutubeLiveInfo, { headers });
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${apiKey}`,
    { cache: "force-cache" },
  );
  if (!response.ok) throw new Error(`YouTube API error: ${response.statusText}`);

  const data = (await response.json()) as APISearchResponse;
  if (data.items.length <= 0) {
    return Response.json("none" satisfies YoutubeLiveInfo, { headers });
  }
  const live = data.items[0];
  const result: YoutubeLiveInfo = {
    url: `https://www.youtube.com/watch?v=${live.id.videoId}`,
    thumbnails: live.snippet.thumbnails[Object.keys(live.snippet.thumbnails)[0]],
    title: live.snippet.title,
  };

  sse.active.pub("live", result);
  return Response.json(result, { headers });
};
