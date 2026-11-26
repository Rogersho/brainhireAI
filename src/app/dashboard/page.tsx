"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserCheck, UserX, Brain, Briefcase, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMyJobs, updateJob, deleteJob } from "@/store/slices/jobsSlice";
import { fetchApplicants } from "@/store/slices/applicantsSlice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { unwrapResult } from "@reduxjs/toolkit";
import Link from "next/link";

const CHART_COLORS = [
  "hsl(222, 28%, 14%)",
  "hsl(199, 89%, 48%)",
  "hsl(152, 60%, 38%)",
  "hsl(38, 92%, 48%)",
  "hsl(215, 20%, 55%)",
];

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { items: jobs, status: jobsStatus } = useAppSelector((state) => state.jobs);
  const { items: applicants, status: appStatus } = useAppSelector((state) => state.applicants);

  useEffect(() => {
    if (jobsStatus === "idle") dispatch(fetchMyJobs());
    if (appStatus === "idle") dispatch(fetchApplicants());
  }, [jobsStatus, appStatus, dispatch]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    location: "",
    description: "",
    skills: "",
  });

  const handleEditClick = (job: any) => {
    setSelectedJob(job);
    setFormData({
      title: job.title,
      department: job.department,
      location: job.location,
      description: job.description || "",
      skills: Array.isArray(job.skills) ? job.skills.join(", ") : "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateJob = async () => {
    setUpdateError(null);
    if (!formData.title || !formData.department || !formData.location) {
      setUpdateError("Please fill in all required fields (Title, Department, Location)");
      return;
    }
    setUpdating(true);
    try {
      const jobData = {
        title: formData.title,
        department: formData.department,
        location: formData.location,
        description: formData.description,
        skills: formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        status: selectedJob.status,
      };
      const result = await dispatch(updateJob({ id: selectedJob._id, jobData }) as any);
      unwrapResult(result);
      setEditDialogOpen(false);
      setSelectedJob(null);
      toast.success("Job updated successfully!");
    } catch (err: any) {
      setUpdateError(err.message || "Failed to update job");
      toast.error(err.message || "Failed to update job");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (job: any) => {
    setSelectedJob(job);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedJob) return;
    setDeleting(true);
    try {
      const result = await dispatch(deleteJob(selectedJob._id) as any);
      unwrapResult(result);
      setDeleteDialogOpen(false);
      setSelectedJob(null);
      toast.success("Job deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete job");
    } finally {
      setDeleting(false);
    }
  };

  const recentJobs = [...jobs]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const totalApplicants = applicants.length;
  const shortlisted = applicants.filter((a: any) => a.status === "Shortlisted").length;
  const hired = applicants.filter((a: any) => a.status === "Hired").length;
  const rejected = applicants.filter((a: any) => a.status === "Rejected").length;
  const inReview = applicants.filter(
    (a: any) => a.status === "In Review" || a.status === "Pending"
  ).length;
  const activePositions = jobs.filter((j: any) => j.status === "Active").length;

  const scoredApplicants = applicants.filter(
    (a: any) => typeof a.score === "number" && a.score > 0
  );
  const avgScore =
    scoredApplicants.length > 0
      ? (
          scoredApplicants.reduce((sum: number, a: any) => sum + a.score, 0) /
          scoredApplicants.length
        ).toFixed(1)
      : "—";

  const weeklyActivity = useMemo(() => {
    const today = new Date();
    const countsByDate = new Map<string, number>();

    applicants.forEach((a: any) => {
      if (!a.createdAt) return;
      const key = toLocalDateKey(new Date(a.createdAt));
      countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
    });

    const data: Array<{ name: string; applicants: number }> = [];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const key = toLocalDateKey(d);
      data.push({
        name: d.toLocaleDateString(undefined, { weekday: "short" }),
        applicants: countsByDate.get(key) || 0,
      });
    }
    return data;
  }, [applicants]);

  const appliedLast7Days = useMemo(
    () => weeklyActivity.reduce((sum, item) => sum + item.applicants, 0),
    [weeklyActivity]
  );

  const sourceDistribution = useMemo(() => {
    const map = new Map<string, number>();
    applicants.forEach((a: any) => {
      const src = a.source?.trim() || "Direct";
      map.set(src, (map.get(src) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [applicants]);

  const dynamicStats = [
    {
      label: "Total Applicants",
      value: totalApplicants.toString(),
      icon: Users,
      meta: `${appliedLast7Days} this week`,
    },
    {
      label: "Shortlisted",
      value: shortlisted.toString(),
      icon: UserCheck,
      meta: hired > 0 ? `${hired} hired` : totalApplicants > 0 ? `${Math.round((shortlisted / totalApplicants) * 100)}% of total` : "0% of total",
    },
    {
      label: "Rejected",
      value: rejected.toString(),
      icon: UserX,
      meta: totalApplicants > 0 ? `${Math.round((rejected / totalApplicants) * 100)}% of total` : "0% of total",
    },
    {
      label: "In Review",
      value: inReview.toString(),
      icon: Brain,
      meta: "Pending & reviewing",
    },
    {
      label: "Open Positions",
      value: activePositions.toString(),
      icon: Briefcase,
      meta: `${jobs.length} total posted`,
    },
    {
      label: "Avg. AI Score",
      value: avgScore,
      icon: TrendingUp,
      meta: `${scoredApplicants.length} screened`,
    },
  ];

  const recentApplicantsDynamic = [...applicants]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live overview of your recruitment pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {dynamicStats.map((stat) => (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {stat.meta}
                  </span>
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
              <CardTitle className="font-heading text-lg">
                Weekly Applications (Last 7 Days)
              </CardTitle>
              <CardDescription>
                {appliedLast7Days === 0
                  ? "No applications received in the last 7 days"
                  : `${appliedLast7Days} ${appliedLast7Days === 1 ? "application" : "applications"} received in the last 7 days`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appliedLast7Days === 0 ? (
                <div className="flex flex-col items-center justify-center h-[260px] rounded-lg border border-dashed border-border bg-muted/20 text-center px-4">
                  <Users className="h-7 w-7 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-medium text-foreground">No applications this week</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Incoming candidate activity will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyActivity}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))" }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                      <Bar
                        dataKey="applicants"
                        name="Applicants"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        barSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Source Distribution</CardTitle>
              <CardDescription>Where your candidates applied from</CardDescription>
            </CardHeader>
            <CardContent>
              {sourceDistribution.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[260px] rounded-lg border border-dashed border-border bg-muted/20 text-center px-4">
                  <p className="text-sm font-medium text-foreground">No applicant sources yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Source breakdown populates as candidates apply.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {sourceDistribution.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {sourceDistribution.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-lg">Recent Job Postings</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link href="/jobs">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentJobs.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                  No job postings yet. Create your first role in Jobs.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">
                          Job Title
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">
                          Dept.
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">
                          Status
                        </th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentJobs.map((job: any) => (
                        <tr
                          key={job._id}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 pr-4 font-medium text-sm text-foreground">
                            {job.title}
                          </td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">
                            {job.department}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                job.status === "Active"
                                  ? "bg-success/10 text-success"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {job.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditClick(job)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteClick(job)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-lg">Recent Applicants</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link href="/applicants">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentApplicantsDynamic.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                  No applicants yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">
                          Candidate
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">
                          Applied For
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">
                          AI Score
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentApplicantsDynamic.map((a: any) => (
                        <tr
                          key={a._id}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 pr-4 font-medium text-sm text-foreground">
                            <Link href={`/applicants/${a._id}`} className="hover:underline">
                              {a.name}
                            </Link>
                          </td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">{a.role}</td>
                          <td className="py-3 pr-4">
                            {a.score > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${a.score}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium text-foreground">
                                  {a.score}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Unscreened</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                a.status === "Shortlisted" || a.status === "Hired"
                                  ? "bg-success/10 text-success"
                                  : a.status === "In Review"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Job Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Edit Job Posting</DialogTitle>
              <DialogDescription>Update the details for this job position.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {updateError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{updateError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Required Skills (comma-separated)</Label>
                <Input
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleUpdateJob} disabled={updating}>
                {updating ? "Updating..." : "Update Job"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-destructive text-xl">
                Delete Job Posting?
              </DialogTitle>
              <DialogDescription className="text-foreground pt-2">
                This action <span className="font-bold underline">cannot be undone</span>.
                <br />
                <br />
                <span className="text-destructive font-bold text-base">
                  WARNING: Deleting this job will immediately and permanently delete all associated
                  applicant data and screening results.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Job"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
