"use client";

import NextImage from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Image({
  src,
  alt,
  className = "",
  ...props
}: React.ComponentProps<typeof NextImage>) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <NextImage
      src={src}
      alt={alt}
      className={cn(
        "opacity-0 transition-opacity duration-600",
        isLoaded && "opacity-100",
        className,
      )}
      onLoad={() => setIsLoaded(true)}
      {...props}
    />
  );
}
