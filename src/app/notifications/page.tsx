"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  UserCheck,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const iconMap: Record<string, React.ReactNode> = {
  Brain: <Brain className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  Briefcase: <Briefcase className="h-5 w-5" />,
  AlertCircle: <AlertCircle className="h-5 w-5" />,
  CheckCircle: <CheckCircle className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  UserPlus: <UserPlus className="h-5 w-5" />,
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; data: Notification[] }>('/notifications');
      if (data.success) {
        setNotifications(data.data);
      } else {
        setError('Failed to load notifications');
      }
    } catch (err: any) {
      setError('Error loading notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Notifications</h1>
              <p className="text-muted-foreground text-sm mt-1">Stay updated on your recruitment activity</p>
            </div>
          </div>
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">Stay updated on your recruitment activity</p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-primary hover:text-primary/80"
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            )}
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} unread</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotifications}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-sm text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {notifications.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`border-border transition-all cursor-pointer hover:border-primary/30 ${!n.read ? "border-l-4 border-l-primary bg-primary/5 shadow-sm" : "opacity-80"
                  }`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${n.type === "success"
                        ? "bg-success/10 text-success"
                        : n.type === "warning"
                          ? "bg-warning/10 text-warning"
                          : n.type === "info"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {iconMap[n.icon] || <Brain className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{n.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                  </div>
                  {!n.read && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  async function markAsRead(id: string) {
    const notification = notifications.find(n => n.id === id);
    if (!notification || notification.read) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

    try {
      await apiFetch(`/notifications/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ read: true })
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      // Parallel requests
      await Promise.all(unreadIds.map(id => 
        apiFetch(`/notifications/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ read: true })
        })
      ));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }
}


// Icon component placeholder (if it's not imported)
const Bell = ({ className }: { className: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);
