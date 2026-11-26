"use client";

import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";
import { useState } from "react";
import { useAuth, getDefaultHomeRoute } from "@/context/AuthContext";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const dashboardLink = getDefaultHomeRoute(user?.role);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="focus:outline-none">
          <BrandLogo size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/jobs"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Open Jobs
          </Link>
          <a
            href="/#features"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Capabilities
          </a>
          <a
            href="/#how-it-works"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Process
          </a>
          <a
            href="/#testimonials"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Customers
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={dashboardLink}>Dashboard</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => logout("/")}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild className="rounded-full px-5">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 py-5 space-y-4">
          <div className="flex flex-col space-y-3">
            <Link
              href="/jobs"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Open Jobs
            </Link>
            <a
              href="/#features"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Capabilities
            </a>
            <a
              href="/#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Process
            </a>
            <a
              href="/#testimonials"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Customers
            </a>
          </div>
          <div className="flex gap-2 pt-3 border-t border-border">
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild className="flex-1" onClick={() => setOpen(false)}>
                  <Link href={dashboardLink}>Dashboard</Link>
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => logout("/")}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="flex-1">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild className="flex-1 rounded-full">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
