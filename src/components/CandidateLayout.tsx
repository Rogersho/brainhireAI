"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Briefcase, FileText, User, Settings, Bell, LogOut,
} from "lucide-react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { title: "Overview", url: "/candidate-dashboard", icon: LayoutDashboard },
  { title: "Find Jobs", url: "/jobs", icon: Briefcase },
  { title: "My Applications", url: "/candidate-dashboard/applications", icon: FileText },
  { title: "Profile", url: "/candidate-dashboard/profile", icon: User },
  { title: "Alerts", url: "/candidate-dashboard/alerts", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

function CandidateSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto shrink-0" />
          {!collapsed && <span className="font-heading text-lg font-bold text-sidebar-foreground">Brainhire AI</span>}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Candidate Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      href={item.url}
                      exact={item.url === "/candidate-dashboard"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="text-muted-foreground hover:text-foreground inline-flex items-center w-full focus:outline-none">
                  <LogOut className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>Log out</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function CandidateLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const initials = session?.user?.name ? session.user.name.substring(0, 2).toUpperCase() : "CA";

  return (
    <SidebarProvider>
      <CandidateSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationBell />
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold border border-primary/20">
              {initials}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-muted/20">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
