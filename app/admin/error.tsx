"use client"; // Error boundaries must be Client Components

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="h-full w-full m-2 ml-0 border bg-[#2225] backdrop-blur-md rounded-md flex flex-col gap-2 justify-center items-center">
      <h2 className="font-bold text-2xl">Something went wrong!</h2>
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        <RefreshCw />
        Try again
      </Button>
    </div>
  );
}
