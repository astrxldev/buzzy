import { NextResponse } from "next/server";

type LiveResponse =
  | {
      url: string;
    }
  | "none";

export async function GET(request: Request) {
  const liveUrl = new URL("https://buzz.sudloh.com/api/live", request.url).toString();
  const response = await fetch(liveUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    return new NextResponse("Failed to get live stream.", {
      status: 502,
    });
  }

  const liveInfo: LiveResponse = await response.json();

  if (liveInfo === "none") {
    return new NextResponse("No live stream found for this channel.", {
      status: 404,
    });
  }

  const videoId = new URL(liveInfo.url).searchParams.get("v");

  if (!videoId) {
    return new NextResponse("Live stream video id was not found.", {
      status: 502,
    });
  }

  return NextResponse.redirect(
    `https://studio.youtube.com/live_chat?is_popout=1&v=${videoId}`,
  );
}
