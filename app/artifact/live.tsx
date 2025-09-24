import { TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { TvMinimalPlay } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import type { YoutubeLiveInfo } from "../api/live/route";

export async function LiveButton() {
  const live: YoutubeLiveInfo = await fetch(`http://localhost:3000/api/live`)
    .then((e) => e.json())
    .catch(() => "none");
  if (live === "none") return;
  const { url, thumbnails } = live;
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
        <Image
          height={thumbnails.height / 10}
          width={thumbnails.width / 10}
          src={thumbnails.url}
          alt="yt thumbnail"
        />
      </TooltipContent>
    </Tooltip>
  );
}
