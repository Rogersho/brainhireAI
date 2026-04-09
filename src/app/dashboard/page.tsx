"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Brain, Briefcase, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchJobs, updateJob, deleteJob } from "@/store/slices/jobsSlice";
import { fetchApplicants } from "@/store/slices/applicantsSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { unwrapResult } from "@reduxjs/toolkit";
import Link from "next/link";

const COLORS = ["hsl(199, 89%, 48%)", "hsl(215, 50%, 12%)", "hsl(199, 70%, 70%)", "hsl(215, 30%, 50%)"];

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { items: jobs, status: jobsStatus } = useAppSelector((state) => state.jobs);
  const { items: applicants, status: appStatus } = useAppSelector((state) => state.applicants);

  useEffect(() => {
    if (jobsStatus === 'idle') dispatch(fetchJobs());
    if (appStatus === 'idle') dispatch(fetchApplicants());
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
        skills: formData.skills.split(",").map(s => s.trim()).filter(s => s),
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

  const recentJobs = [...jobs].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-lg">Recent Job Postings</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link href="/jobs">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Job Title</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Dept.</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Status</th>
                      <th className="text-right text-xs font-medium text-muted-foreground py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job: any) => (
                      <tr key={job._id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-sm text-foreground">{job.title}</td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">{job.department}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            job.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(job)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteClick(job)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

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
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${a.score}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-foreground">{a.score}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
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
              <Button
                className="w-full"
                onClick={handleUpdateJob}
                disabled={updating}
              >
                {updating ? "Updating..." : "Update Job"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-destructive text-xl">Delete Job Posting?</DialogTitle>
              <DialogDescription className="text-foreground pt-2">
                This action <span className="font-bold underline">cannot be undone</span>. 
                <br /><br />
                <span className="text-destructive font-bold text-base">
                  ⚠️ WARNING: Deleting this job will immediately and permanently delete all associated applicant data and screening results.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
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
