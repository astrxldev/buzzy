import { TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { TvMinimalPlay } from "lucide-react";
import Link from "next/link";
import type { YoutubeLiveInfo } from "@/app/api/live/route";
import Image from "@/components/image";
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
            <TvMinimalPlay className="animate-pulse text-red-500" /> LIVE
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <div className="m-2 flex flex-col gap-2 rounded border bg-card p-2">
          <Image
            height={thumbnails.height * (targetWidth / thumbnails.width)}
            width={targetWidth}
            src={thumbnails.url}
            alt="yt thumbnail"
            className="rounded border"
          />
          <div
            // oxlint-disable-next-line tailwindcss/no-conflicting-classes
            className="line-clamp-2 truncate"
            style={{ maxWidth: targetWidth }}
          >
            {title}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
