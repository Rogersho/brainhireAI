"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Briefcase,
  ShieldCheck,
  Sparkles,
  Clock,
  LifeBuoy,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  useEffect(() => {
    apiFetch<{ data: any }>("/analytics/hr-overview")
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.message || "Failed to load HR analytics"))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateBrief = async () => {
    setGeneratingBrief(true);
    try {
      const res = await apiFetch<{ data: { brief: string } }>("/analytics/ai-brief", {
        method: "POST",
      });
      setAiBrief(res.data.brief);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI executive brief");
    } finally {
      setGeneratingBrief(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Executive HR Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time workforce, recruiting, attendance, compliance, and payroll metrics from Neon PostgreSQL.
            </p>
          </div>
          <Button size="sm" onClick={handleGenerateBrief} disabled={generatingBrief || loading}>
            {generatingBrief ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            {generatingBrief ? "Generating Brief..." : "Generate AI Executive Brief"}
          </Button>
        </div>

        {aiBrief && (
          <Card className="border-primary/30 bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI Monthly HR Executive Brief
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {aiBrief}
              </p>
            </CardContent>
          </Card>
        )}

        {loading || !data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs">Active Workforce</span>
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{data.workforce.activeWorkforce}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Turnover: {data.workforce.turnoverRatePercent}%
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs">Open Jobs</span>
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{data.recruiting.activeJobs}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {data.recruiting.totalApplicants} applicants · {data.recruiting.hiredCount} hired
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs">Pending Approvals</span>
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {data.operations.pendingLeaves + data.operations.pendingExpenses}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {data.operations.pendingLeaves} leave · {data.operations.pendingExpenses} expenses
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs">Policy Compliance</span>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {data.operations.policyCompliancePercent}%
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Acknowledged policies
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs">Open HR Tickets</span>
                    <LifeBuoy className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{data.operations.openHelpdeskTickets}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {data.operations.pendingOnboardingTasks} onboarding tasks open
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Headcount by Department</CardTitle>
                  <CardDescription>Active workers grouped by department</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.workforce.byDepartment.length === 0 ? (
                    <p className="py-16 text-center text-xs text-muted-foreground">
                      No active employees yet.
                    </p>
                  ) : (
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.workforce.byDepartment}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="department" fontSize={12} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} fontSize={12} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="count" name="Employees" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Recent Payroll Runs (Net Spend)</CardTitle>
                  <CardDescription>Monthly payroll disbursement history</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.payrollHistory.length === 0 ? (
                    <p className="py-16 text-center text-xs text-muted-foreground">
                      No payroll runs generated yet.
                    </p>
                  ) : (
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...data.payrollHistory].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" fontSize={11} axisLine={false} tickLine={false} />
                          <YAxis fontSize={11} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="totalNet" name="Net Pay ($)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
