import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background py-14">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-border/70">
          <div className="space-y-2">
            <Link href="/">
              <BrandLogo size="sm" />
            </Link>
            <p className="text-xs text-muted-foreground max-w-xs">
              Minimalist AI recruitment and candidate evaluation for modern teams.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <Link href="/jobs" className="hover:text-foreground transition-colors">
              Open Jobs
            </Link>
            <Link href="/screening" className="hover:text-foreground transition-colors">
              AI Screening
            </Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} Hoobe HR. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
