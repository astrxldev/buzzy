import { NextResponse } from "next/server";

export const revalidate = 900;

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

export async function GET() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey || !channelId) return NextResponse.json<YoutubeLiveInfo>("none");

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${apiKey}`,
    {
      next: {
        revalidate: 900, // refresh every 15 minutes
      },
      cache: "force-cache",
    },
  );

  if (!response.ok)
    throw new Error(`YouTube API error: ${response.statusText}`);

  const data: APISearchResponse = await response.json();
  if (data.items.length <= 0) return NextResponse.json<YoutubeLiveInfo>("none");
  const live = data.items[0];
  return NextResponse.json<YoutubeLiveInfo>({
    url: `https://www.youtube.com/watch?v=${live.id.videoId}`,
    thumbnails:
      live.snippet.thumbnails[Object.keys(live.snippet.thumbnails)[0]],
    title: live.snippet.title,
  });
}
