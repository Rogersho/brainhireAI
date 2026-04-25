"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, AlertCircle, Briefcase, UserCheck, Brain, UserPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import { usePathname } from "next/navigation";

const iconMap: Record<string, any> = {
  Brain: Brain,
  UserCheck: UserCheck,
  Briefcase: Briefcase,
  AlertCircle: AlertCircle,
  CheckCircle: CheckCircle,
  Clock: Clock,
  UserPlus: UserPlus,
};

interface Notification {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'default';
  read: boolean;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      
      if (!response.ok) return;

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;

      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.slice(0, 5));
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Also refresh when moving back to dashboard or notifications page
  useEffect(() => {
    fetchNotifications();
  }, [pathname]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-muted">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && <Badge variant="secondary" className="text-[10px]">{unreadCount} new</Badge>}
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-4 flex items-start gap-3 hover:bg-muted/50 cursor-pointer transition-colors border-b last:border-0 ${!n.read ? "bg-primary/5" : ""}`}
              >
                <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === 'success' ? 'bg-success/10 text-success' :
                  n.type === 'warning' ? 'bg-warning/10 text-warning' :
                  n.type === 'info' ? 'bg-primary/10 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {iconMap[n.icon] ? 
                    (() => {
                        const Icon = iconMap[n.icon];
                        return <Icon className="h-4 w-4" />;
                    })() : <Bell className="h-4 w-4" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.description}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</p>
                </div>
                {!n.read && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
