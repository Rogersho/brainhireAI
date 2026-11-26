import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-24 md:py-32 border-t border-border bg-muted/25">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-heading text-3xl md:text-4xl font-medium tracking-tight text-foreground">
              Ready to simplify your hiring?
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Create your Hoobe HR workspace in seconds and start screening candidates with clarity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button size="lg" asChild className="rounded-full px-7 h-11 text-sm font-medium">
              <Link href="/signup">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="rounded-full px-7 h-11 text-sm font-medium"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
