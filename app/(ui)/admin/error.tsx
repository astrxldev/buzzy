"use client"; // Error boundaries must be Client Components

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="m-2 ml-0 flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border bg-[#2225] backdrop-blur-md">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => {
            setLoading(true);
            setTimeout(() => reset(), 500);
          }
        }
        disabled={loading}
      >
        {loading ? <Spinner /> : <RefreshCw />}
        Try again
      </Button>
    </div>
  );
}
