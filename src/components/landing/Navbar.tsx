"use client";

import Link from "next/link";
import { Brain, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const dashboardLink = user?.role === "Candidate" ? "/candidate-dashboard" : "/dashboard";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
          <img src="/logo.png" alt="Brainhire AI" className="h-8 w-auto" />
          Brainhire AI
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Open Jobs</Link>
          <a href="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="/#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Button variant="ghost" asChild><Link href={dashboardLink}>Dashboard</Link></Button>
              <Button onClick={() => logout('/')}><LogOut className="h-4 w-4 mr-2" /> Sign Out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild><Link href="/login">Log in</Link></Button>
              <Button asChild><Link href="/signup">Get Started</Link></Button>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
          <Link href="/jobs" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Open Jobs</Link>
          <a href="/#features" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Features</a>
          <a href="/#how-it-works" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>How It Works</a>
          <a href="/#testimonials" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Testimonials</a>
          <div className="flex gap-2 pt-2">
            {user ? (
              <>
                <Button variant="ghost" asChild className="flex-1" onClick={() => setOpen(false)}><Link href={dashboardLink}>Dashboard</Link></Button>
                <Button className="flex-1" onClick={() => logout('/')}><LogOut className="h-4 w-4 mr-2" /> Sign Out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="flex-1"><Link href="/login">Log in</Link></Button>
                <Button asChild className="flex-1"><Link href="/signup">Get Started</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
