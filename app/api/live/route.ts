import type { NextRequest } from "next/server";
import { youtubeCache } from "@/lib/adaptive-cache";
import { sse } from "@/lib/db/sse-endpoints";
import { createLiveHandler } from "./handler";

export type { YoutubeLiveInfo } from "./handler";

const handler = createLiveHandler({
  fetch: youtubeCache.fetch.bind(youtubeCache) as typeof fetch,
  publish: (live) => sse.active.pub("live", live),
  getConfig: () => ({
    apiKey: process.env.YOUTUBE_API_KEY,
    channelId: process.env.YOUTUBE_CHANNEL_ID,
  }),
});

export function GET(req: NextRequest) {
  return handler(req);
}

export const POST = GET;

export const revalidate = 60;
