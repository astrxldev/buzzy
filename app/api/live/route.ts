import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sse } from "@/lib/db/sse-endpoints";
import { youtubeCache } from "@/lib/adaptive-cache";

export type YoutubeLiveInfo =
  | {
      url: string;
      thumbnails: {
        url: string;
        width: number;
        height: number;
      };
      title: string;
    }
  | "none";

type APISearchResource = {
  kind: "youtube#searchResult";
  etag: string;
  id: {
    kind: string;
    videoId: string;
    channelId: string;
    playlistId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      [key: string]: {
        url: string;
        width: number;
        height: number;
      };
    };
    channelTitle: string;
    liveBroadcastContent: string;
  };
};

type APISearchResponse = {
  kind: "youtube#searchListResponse";
  etag: string;
  nextPageToken: string;
  prevPageToken: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: APISearchResource[];
};

var lastResponse: Response;

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.has("last") && lastResponse)
    return lastResponse.clone();

  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey || !channelId) return NextResponse.json<YoutubeLiveInfo>("none");

  const response = await youtubeCache.fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${apiKey}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error(`YouTube API error: ${response.statusText}`);
    return NextResponse.json("none");
  }

  const data: APISearchResponse = await response.json();

  if (data.items.length === 0)
    return NextResponse.json<YoutubeLiveInfo>("none");

  const live = data.items[0];

  const res: YoutubeLiveInfo = {
    url: `https://www.youtube.com/watch?v=${live.id.videoId}`,
    thumbnails:
      live.snippet.thumbnails[Object.keys(live.snippet.thumbnails)[0]],
    title: live.snippet.title,
  };

  sse.active.pub("live", res);

  return (lastResponse = NextResponse.json<YoutubeLiveInfo>(res));
}

export const POST = GET;

export const revalidate = 60;
