"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, UserCheck, Briefcase, AlertCircle, CheckCircle, Clock, UserPlus } from "lucide-react";

const notifications = [
  { id: 1, icon: Brain, title: "AI Screening Completed", description: "87 applicants screened for Senior Frontend Developer. 5 recommended.", time: "2 minutes ago", type: "info", read: false },
  { id: 2, icon: UserCheck, title: "Candidate Shortlisted", description: "Alex Rivera has been moved to the shortlist for Senior Frontend Developer.", time: "1 hour ago", type: "success", read: false },
  { id: 3, icon: UserPlus, title: "New Application", description: "Kim Tanaka applied for Senior Frontend Developer via LinkedIn.", time: "3 hours ago", type: "default", read: false },
  { id: 4, icon: Briefcase, title: "Job Posted", description: "Product Manager position is now live and accepting applications.", time: "Yesterday", type: "info", read: true },
  { id: 5, icon: AlertCircle, title: "Low Response Rate", description: "DevOps Engineer position has received only 12 applications in 2 weeks.", time: "Yesterday", type: "warning", read: true },
  { id: 6, icon: CheckCircle, title: "Interview Scheduled", description: "Interview with Priya Patel confirmed for Jan 25, 2026 at 2:00 PM.", time: "2 days ago", type: "success", read: true },
  { id: 7, icon: Clock, title: "Screening Reminder", description: "38 pending applicants for Backend Engineer need review.", time: "3 days ago", type: "warning", read: true },
];

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">Stay updated on your recruitment activity</p>
          </div>
          <Badge variant="secondary">{notifications.filter(n => !n.read).length} unread</Badge>
        </div>

        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={`border-border transition-colors ${!n.read ? "border-l-4 border-l-primary bg-primary/5" : ""}`}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === "success" ? "bg-success/10 text-success" :
                  n.type === "warning" ? "bg-warning/10 text-warning" :
                  n.type === "info" ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  <n.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{n.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.description}</p>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
