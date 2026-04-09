"use client";

import { useSession } from "next-auth/react";
import { CandidateLayout } from "@/components/CandidateLayout";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Eye, AlertCircle, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchJobs, fetchMyJobs, createJob, updateJob, deleteJob } from "@/store/slices/jobsSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { unwrapResult } from "@reduxjs/toolkit";

export default function JobsPage() {
  const { data: session } = useSession();
  const isCandidate = (session?.user as any)?.role === "Candidate";

  useEffect(() => {
    console.log('JobsPage - Session:', session);
    console.log('JobsPage - User role:', (session?.user as any)?.role);
  }, [session]);

  const dispatch = useAppDispatch();
  const { items: jobs, status, error } = useAppSelector((state) => state.jobs);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    location: "",
    description: "",
    skills: "",
  });

  const Layout = isCandidate ? CandidateLayout : DashboardLayout;

  useEffect(() => {
    if (status === 'idle') {
      // Recruiters see only their jobs, candidates see all jobs
      if (isCandidate) {
        dispatch(fetchJobs());
      } else {
        dispatch(fetchMyJobs());
      }
    }
  }, [status, dispatch, isCandidate]);

  const handleCreateJob = async () => {
    setCreateError(null);

    // Validate fields
    if (!formData.title || !formData.department || !formData.location) {
      setCreateError("Please fill in all required fields (Title, Department, Location)");
      return;
    }

    setCreating(true);
    try {
      const jobData = {
        title: formData.title,
        department: formData.department,
        location: formData.location,
        description: formData.description,
        skills: formData.skills.split(",").map(s => s.trim()).filter(s => s),
        status: "Active",
      };

      console.log('Creating job with data:', jobData);
      const result = await dispatch(createJob(jobData) as any);
      console.log('Job creation result:', result);
      unwrapResult(result);

      // Reset form
      setFormData({ title: "", department: "", location: "", description: "", skills: "" });
      setDialogOpen(false);
      toast.success("Job created successfully!");
    } catch (err: any) {
      console.error('Job creation error:', err);
      const errorMsg = err.payload || err.message || "Failed to create job";
      setCreateError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

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
      console.error('Job update error:', err);
      const errorMsg = err.message || "Failed to update job";
      setUpdateError(errorMsg);
      toast.error(errorMsg);
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
      console.error('Job deletion error:', err);
      toast.error(err.message || "Failed to delete job");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = jobs.filter((j: any) => j.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {isCandidate ? "Job Board" : "Job Postings"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isCandidate ? "Find your next role and apply in one click." : "Manage your open positions."}
            </p>
          </div>

          {!isCandidate && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (open) {
                setFormData({ title: "", department: "", location: "", description: "", skills: "" });
                setCreateError(null);
              }
              setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Create Job</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading">Create New Job</DialogTitle>
                  <DialogDescription className="sr-only">Fill out the details to create a new job posting.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {createError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{createError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label>Job Title *</Label>
                    <Input
                      placeholder="e.g. Senior Frontend Developer"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <Input
                        placeholder="Engineering"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location *</Label>
                      <Input
                        placeholder="Remote"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the role, responsibilities, and requirements..."
                      rows={5}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Required Skills (comma-separated)</Label>
                    <Input
                      placeholder="React, TypeScript, Node.js"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateJob}
                    disabled={creating}
                  >
                    {creating ? "Publishing..." : "Publish Job"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {status === 'loading' && <p className="text-muted-foreground">Loading jobs...</p>}
          {filtered.map((job: any) => (
            <Card key={job._id} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">{job.department} · {job.location}</p>
                    {!isCandidate && job.createdBy && (
                      <p className="text-xs text-muted-foreground mt-1">By: {typeof job.createdBy === 'object' ? job.createdBy.name : 'You'}</p>
                    )}
                  </div>
                  <Badge variant={job.status === "Active" ? "default" : job.status === "Paused" ? "secondary" : "outline"}>
                    {job.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {!isCandidate ? (
                      <>
                        <Users className="h-4 w-4" />
                        View applicants
                      </>
                    ) : (
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">Full-Time</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/jobs/${job._id}`}>
                      <Eye className="mr-2 h-3 w-3" /> {isCandidate ? "View Details & Apply" : "View Details"}
                    </Link>
                  </Button>
                  {!isCandidate && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(job)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(job)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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
    </Layout>
  );
}
