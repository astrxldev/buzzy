import { TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { TvMinimalPlay } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { YoutubeLiveInfo } from "@/app/api/live/route";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

export async function LiveButton() {
  const live: YoutubeLiveInfo = await fetch(`http://localhost:3000/api/live`)
    .then((e) => e.json())
    .catch(() => "none");
  if (live === "none") return;
  const { url, thumbnails, title } = live;

  const targetWidth = 220;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={url}>
          <Button variant="outline" type="button">
            <TvMinimalPlay className="text-red-500 animate-pulse" /> LIVE
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <div className="m-2 p-2 flex flex-col gap-2 rounded border bg-card">
          <Image
            height={thumbnails.height * (targetWidth / thumbnails.width)}
            width={targetWidth}
            src={thumbnails.url}
            alt="yt thumbnail"
            className="rounded border"
          />
          <div
            className="truncate line-clamp-2"
            style={{ maxWidth: targetWidth }}
          >
            {title}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
