"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Brain, Briefcase, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const stats = [
  { label: "Total Applicants", value: "1,247", icon: Users, change: "+12%" },
  { label: "Shortlisted", value: "186", icon: UserCheck, change: "+8%" },
  { label: "Rejected", value: "892", icon: UserX, change: "-3%" },
  { label: "In Screening", value: "169", icon: Brain, change: "+24%" },
  { label: "Open Positions", value: "23", icon: Briefcase, change: "+2" },
  { label: "Avg. Score", value: "72.4", icon: TrendingUp, change: "+5.2" },
];

const weeklyData = [
  { day: "Mon", applicants: 32, screened: 28 },
  { day: "Tue", applicants: 45, screened: 40 },
  { day: "Wed", applicants: 28, screened: 25 },
  { day: "Thu", applicants: 52, screened: 48 },
  { day: "Fri", applicants: 38, screened: 35 },
  { day: "Sat", applicants: 15, screened: 12 },
  { day: "Sun", applicants: 8, screened: 6 },
];

const sourceData = [
  { name: "Internal Pool", value: 35 },
  { name: "LinkedIn", value: 28 },
  { name: "Indeed", value: 22 },
  { name: "Direct Apply", value: 15 },
];

const COLORS = ["hsl(199, 89%, 48%)", "hsl(215, 50%, 12%)", "hsl(199, 70%, 70%)", "hsl(215, 30%, 50%)"];

const recentApplicants = [
  { name: "Alex Rivera", role: "Senior Frontend Dev", score: 92, status: "Shortlisted" },
  { name: "Priya Patel", role: "Data Scientist", score: 88, status: "Shortlisted" },
  { name: "Marcus Chen", role: "Product Manager", score: 75, status: "In Review" },
  { name: "Sofia Andersen", role: "UX Designer", score: 71, status: "In Review" },
  { name: "James Okafor", role: "Backend Engineer", score: 64, status: "Pending" },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your recruitment pipeline</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((stat) => (
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
              <CardTitle className="font-heading text-lg">Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="applicants" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} name="Applicants" />
                  <Bar dataKey="screened" fill="hsl(215, 50%, 12%)" radius={[4, 4, 0, 0]} name="Screened" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Source Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {sourceData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}%</span>
                  </div>
                ))}
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
                  {recentApplicants.map((a) => (
                    <tr key={a.name} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
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
