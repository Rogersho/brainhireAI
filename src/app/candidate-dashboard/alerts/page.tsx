"use client";

import { CandidateLayout } from "@/components/CandidateLayout";
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
  Bell,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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

export default function CandidateAlertsPage() {
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
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
      } else {
        setError('Failed to load alerts');
      }
    } catch (err: any) {
      setError('Error loading alerts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification || notification.read) return;

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      await Promise.all(unreadIds.map(id => 
        fetch(`/api/notifications/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true })
        })
      ));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <CandidateLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Alerts & Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">Updates on your job applications and profile</p>
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
            <CardContent className="p-4 text-sm text-red-800">
              {error}
            </CardContent>
          </Card>
        )}

        {loading ? (
           <div className="space-y-3">
             {[1, 2, 3].map(i => (
               <Card key={i} className="animate-pulse border-border">
                  <CardContent className="p-4 h-20 bg-muted/20" />
               </Card>
             ))}
           </div>
        ) : notifications.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium">All caught up!</p>
              <p className="text-sm mt-1">We'll notify you here when your application status changes.</p>
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
                    {iconMap[n.icon] || <Bell className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                       <p className={`text-sm font-semibold ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                       <span className="text-xs text-muted-foreground shrink-0">{n.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.description}</p>
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
    </CandidateLayout>
  );
}
