"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useAuth, isHrRole, isHiringRole } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Brain,
  Settings,
  Bell,
  LogOut,
  UserCheck,
  Network,
  ClipboardCheck,
  Building2,
  CalendarClock,
  FileSignature,
  Clock,
  CalendarDays,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandLogo } from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";

interface NavSection {
  label: string;
  items: Array<{ title: string; url: string; icon: any; exact?: boolean }>;
}

function AppSidebar() {
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const collapsed = state === "collapsed";

  const hrAccess = isHrRole(user?.role);
  const hiringAccess = isHiringRole(user?.role);

  const sections: NavSection[] = [
    ...(hiringAccess
      ? [
          {
            label: "Overview",
            items: [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, exact: true },
              { title: "Notifications", url: "/notifications", icon: Bell },
            ],
          },
        ]
      : [
          {
            label: "Overview",
            items: [{ title: "Notifications", url: "/notifications", icon: Bell }],
          },
        ]),
    {
      label: "People",
      items: [
        { title: "Employees", url: "/employees", icon: UserCheck },
        { title: "Org Chart", url: "/org-chart", icon: Network },
        ...(hrAccess ? [{ title: "Onboarding", url: "/onboarding", icon: ClipboardCheck }] : []),
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Attendance", url: "/attendance", icon: Clock },
        { title: "Leave & PTO", url: "/leave", icon: CalendarDays },
      ],
    },
    ...(hiringAccess
      ? [
          {
            label: "Recruitment",
            items: [
              { title: "Jobs", url: "/jobs", icon: Briefcase },
              { title: "Applicants", url: "/applicants", icon: Users },
              { title: "AI Screening", url: "/screening", icon: Brain },
              { title: "Interviews", url: "/interviews", icon: CalendarClock },
              ...(hrAccess ? [{ title: "Offers", url: "/offers", icon: FileSignature }] : []),
            ],
          },
        ]
      : [
          {
            label: "Internal Roles",
            items: [{ title: "Open Jobs", url: "/jobs", icon: Briefcase }],
          },
        ]),
    {
      label: "Company",
      items: [
        ...(hrAccess ? [{ title: "Organization", url: "/organization", icon: Building2 }] : []),
        { title: "Settings", url: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <Link href="/" className="focus:outline-none">
            <BrandLogo showText={!collapsed} size="md" />
          </Link>
        </div>

        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        href={item.url}
                        exact={item.exact}
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
        ))}

        <div className="mt-auto p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button
                  onClick={() => logout("/")}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center w-full focus:outline-none"
                >
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

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : "HR";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="flex items-center gap-3">
            {user?.role && (
              <Badge variant="secondary" className="hidden sm:inline-flex text-[11px] font-medium">
                {user.role}
              </Badge>
            )}
            <ThemeToggle />
            <NotificationBell />
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold border border-primary/20">
              {initials}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
