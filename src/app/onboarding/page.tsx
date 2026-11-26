"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const [overview, setOverview] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: any[] }>("/checklists/overview"),
      apiFetch<{ data: any[] }>("/checklists/templates"),
      apiFetch<{ data: any[] }>("/documents/expiring?days=60"),
    ])
      .then(([oRes, tRes, dRes]) => {
        setOverview(oRes.data || []);
        setTemplates(tRes.data || []);
        setExpiringDocs(dRes.data || []);
      })
      .catch((err) => toast.error(err.message || "Failed to load onboarding workspace"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Onboarding &amp; Offboarding
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track employee checklist progress, reusable HR templates, and expiring compliance documents.
          </p>
        </div>

        {expiringDocs.length > 0 && (
          <Card className="border-warning/40 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                {expiringDocs.length} Employee Document{expiringDocs.length > 1 ? "s" : ""} Expiring Within 60 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {expiringDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between text-xs">
                  <span>
                    <Link href={`/employees/${doc.employeeId}`} className="font-medium hover:underline">
                      {doc.employeeName}
                    </Link>{" "}
                    — {doc.title} ({doc.category})
                  </span>
                  <span className="font-medium">
                    Expires {new Date(doc.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="pipelines">
            <TabsList>
              <TabsTrigger value="pipelines">Active Checklists ({overview.length})</TabsTrigger>
              <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pipelines" className="mt-6 space-y-4">
              {overview.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center space-y-2">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">No active checklists yet</p>
                    <p className="text-xs text-muted-foreground">
                      Checklists automatically start when you add an employee or convert a hired applicant.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overview.map((item) => (
                    <Card key={`${item.employeeId}-${item.checklistType}`} className="border-border">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link
                              href={`/employees/${item.employeeId}`}
                              className="font-medium text-foreground hover:underline flex items-center gap-1"
                            >
                              {item.fullName}
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {item.jobTitle}
                              {item.departmentName ? ` · ${item.departmentName}` : ""}
                            </p>
                          </div>
                          <Badge
                            variant={item.checklistType === "Onboarding" ? "default" : "destructive"}
                            className="text-[10px]"
                          >
                            {item.checklistType}
                          </Badge>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {item.completedTasks} / {item.totalTasks} tasks complete
                            </span>
                            <span className="font-medium text-foreground">{item.progressPercent}%</span>
                          </div>
                          <Progress value={item.progressPercent} className="h-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{tpl.name}</CardTitle>
                      <Badge variant="outline">{tpl.type}</Badge>
                    </div>
                    {tpl.description && <CardDescription>{tpl.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tpl.tasks.map((t: any, i: number) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-xs py-1.5 border-b border-border/60 last:border-0"
                      >
                        <span className="text-foreground">
                          {i + 1}. {t.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {t.category}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
