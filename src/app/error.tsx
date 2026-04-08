"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
        Something went wrong!
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        We encountered an unexpected error. Please try refreshing the page or navigating back home.
      </p>
      <div className="flex gap-4 items-center justify-center">
        <Button variant="outline" onClick={() => reset()}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
        </Button>
        <Button asChild>
          <Link href="/">Back to Safety</Link>
        </Button>
      </div>
    </div>
  );
}
