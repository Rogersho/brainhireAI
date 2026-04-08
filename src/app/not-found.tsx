"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, SearchX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4 text-center">
      <div className="mb-8">
        <Brain className="h-16 w-16 text-primary mx-auto animate-pulse" />
      </div>
      <h1 className="text-6xl font-heading font-black text-foreground mb-4 tracking-tighter">
        4<span className="text-primary">0</span>4
      </h1>
      <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        Looks like our AI couldn't find the page you were looking for. It might have been moved or deleted.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </div>
  );
}
