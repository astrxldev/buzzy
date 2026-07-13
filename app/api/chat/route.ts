import { NextResponse } from "next/server";

type APISearchResponse = {
  items?: {
    id?: {
      videoId?: string;
    };
  }[];
};

const channelId = "UCC80OcUEuutVW37MC190JJg";

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return new NextResponse("YOUTUBE_API_KEY is not configured.", {
      status: 500,
    });
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${apiKey}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return new NextResponse("Failed to search for live stream.", {
      status: 502,
    });
  }

  const data: APISearchResponse = await response.json();
  const videoId = data.items?.[0]?.id?.videoId;

  if (!videoId) {
    return new NextResponse("No live stream found for this channel.", {
      status: 404,
    });
  }

  return NextResponse.redirect(
    `https://www.youtube.com/live_chat?is_popout=${videoId}`,
  );
}
