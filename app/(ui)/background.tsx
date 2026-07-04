"use client";

import Image from "next/image";
import Background0 from "#/bg.webp";
import Background1 from "#/bgassets/buzzbg1-r2.webp";
import Background2 from "#/bgassets/buzzbg2-r1.webp";
import Background3 from "#/bgassets/buzzbg3-r1.webp";
import Background4 from "#/bgassets/buzzbg4-r1.webp";
import Background5 from "#/bgassets/buzzbg5-r1.webp";
import Background6 from "#/bgassets/buzzbg6-r1.webp";
import Background7 from "#/bgassets/buzzbg7-r1.webp";
import type { StaticImport } from "next/dist/shared/lib/get-img-props";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { StarsRenderer } from "@/components/stars";

type PrefixBackground = [`/${string}`, string | StaticImport, `/${string}`];
const backgrounds = [
  // path prefix, background, stars mask
  ["/artifact", Background1, "/bgassets/buzzbg1-r2-mask.webp"],
  ["/rubgram", Background2, "/bgassets/buzzbg2-r1-mask.webp"],
  ["/donate", Background3, "/bgassets/buzzbg3-r1-mask.webp"],
  ["/tl", Background5, "/bgassets/buzzbg4-r1-mask.webp"],
  ["/guide", Background4, "/bgassets/buzzbg5-r1-mask.webp"],
  ["/admin", Background6, "/bgassets/buzzbg6-r1-mask.webp"],
  // unused
  ["/donate", Background7, "/bgassets/buzzbg7-r1-mask.webp"],
  // this should be last
  ["/", Background0, "/mask.webp"],
] satisfies PrefixBackground[];

export function BackgroundProvider() {
  const pathname = usePathname();
  const [, background, mask] = useMemo(
    () => backgrounds.find((b) => pathname.startsWith(b[0]))!,
    [pathname],
  );
  const [transitioning, setTransitioning] = useState(false);
  const [current, setCurrent] = useState<string | StaticImport>(background);

  return (
    <>
      <Image
        src={background}
        alt="Background Swap"
        className={cn(
          "fixed top-0 left-0 z-[-1] h-fit min-h-dvh w-full object-cover opacity-0",
          transitioning && "opacity-40 transition-opacity duration-500",
        )}
        onLoad={() => {
          if (background === current) return;
          setTransitioning(true);
        }}
        onTransitionEnd={() => {
          if (!transitioning) return;
          setCurrent(background);
          setTransitioning(false);
        }}
      />
      <Image
        src={current}
        alt="Background Current"
        className={cn(
          "fixed top-0 left-0 z-[-1] h-fit min-h-dvh w-full object-cover opacity-40",
          transitioning && "opacity-0 transition-opacity duration-500",
        )}
      />
      {transitioning || <StarsRenderer mask={mask} />}
    </>
  );
}
