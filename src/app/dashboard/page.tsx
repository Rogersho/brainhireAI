"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Brain, Briefcase, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchJobs } from "@/store/slices/jobsSlice";
import { fetchApplicants } from "@/store/slices/applicantsSlice";

const COLORS = ["hsl(199, 89%, 48%)", "hsl(215, 50%, 12%)", "hsl(199, 70%, 70%)", "hsl(215, 30%, 50%)"];

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { items: jobs, status: jobsStatus } = useAppSelector((state) => state.jobs);
  const { items: applicants, status: appStatus } = useAppSelector((state) => state.applicants);

  useEffect(() => {
    if (jobsStatus === 'idle') dispatch(fetchJobs());
    if (appStatus === 'idle') dispatch(fetchApplicants());
  }, [jobsStatus, appStatus, dispatch]);

  const totalApplicants = applicants.length;
  const shortlisted = applicants.filter((a: any) => a.status === 'Shortlisted').length;
  const rejected = applicants.filter((a: any) => a.status === 'Rejected').length;
  const inReview = applicants.filter((a: any) => a.status === 'In Review' || a.status === 'Pending').length;
  const openPositions = jobs.length;
  
  const avgScore = applicants.length 
    ? (applicants.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / applicants.length).toFixed(1) 
    : "0.0";

  const dynamicStats = [
    { label: "Total Applicants", value: totalApplicants.toString(), icon: Users, change: "+12%" },
    { label: "Shortlisted", value: shortlisted.toString(), icon: UserCheck, change: "+8%" },
    { label: "Rejected", value: rejected.toString(), icon: UserX, change: "-3%" },
    { label: "In Review", value: inReview.toString(), icon: Brain, change: "+24%" },
    { label: "Open Positions", value: openPositions.toString(), icon: Briefcase, change: "+2" },
    { label: "Avg. Score", value: avgScore, icon: TrendingUp, change: "+5.2" },
  ];

  const recentApplicantsDynamic = [...applicants].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your recruitment pipeline</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {dynamicStats.map((stat) => (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium text-success">{stat.change}</span>
                </div>
                <p className="font-heading text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Weekly Activity (Coming Soon)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                Charts will be populated here
              </div>
            </CardContent>
  
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Source Distribution (Coming Soon)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-center h-[200px] text-muted-foreground">
                 Pending AI Parser Integration
              </div>
  
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Recent Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Candidate</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Applied For</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">AI Score</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplicantsDynamic.map((a: any) => (
                    <tr key={a._id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-sm text-foreground">{a.name}</td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">{a.role}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${a.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">{a.score}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          a.status === "Shortlisted" ? "bg-success/10 text-success" :
                          a.status === "In Review" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
