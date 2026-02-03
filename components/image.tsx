"use client";

import NextImage from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./ui/spinner";

export default function Image({
  src,
  alt,
  className = "",
  ...props
}: React.ComponentProps<typeof NextImage>) {
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  }>();

  useLayoutEffect(() => {
    if (ref.current?.parentElement) {
      const { top: pTop, left: pLeft } =
        ref.current.parentElement.getBoundingClientRect();
      const { top, left, width, height } = ref.current.getBoundingClientRect();
      setRect({ top: top - pTop, left: left - pLeft, width, height });
    }
  }, []);

  return (
    <>
      <NextImage
        ref={ref}
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-700 opacity-0",
          isLoaded && "opacity-100",
          className,
        )}
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
      {isLoaded || (
        <div
          className="absolute backdrop-blur-md bg-[#2228] p-1 overflow-hidden rounded-sm animate-in fade-in"
          style={rect}
        >
          <Spinner />
        </div>
      )}
    </>
  );
}
