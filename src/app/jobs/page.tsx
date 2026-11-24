"use client";

import { useAuth } from "@/context/AuthContext";
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
import { Navbar } from "@/components/landing/Navbar";
import { JobDialog } from "@/components/JobDialog";

export default function JobsPage() {
  const { user, status: sessionStatus } = useAuth();
  
  const isGuest = sessionStatus === "unauthenticated";
  const isRecruiter = user?.role === "Recruiter";
  const isCandidate = user?.role === "Candidate" || isGuest;

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

  useEffect(() => {
    if (status === 'idle' && sessionStatus !== 'loading') {
      // Recruiters see only their jobs, candidates see all jobs
      if (isCandidate) {
        dispatch(fetchJobs());
      } else {
        dispatch(fetchMyJobs());
      }
    }
  }, [status, dispatch, isCandidate, sessionStatus]);

  const handleCreateJob = async (data: any) => {
    setCreateError(null);

    // Validate fields
    if (!data.title || !data.department || !data.location) {
      setCreateError("Please fill in all required fields (Title, Department, Location)");
      return;
    }

    setCreating(true);
    try {
      const jobData = {
        title: data.title,
        department: data.department,
        location: data.location,
        description: data.description,
        skills: data.skills.split(",").map((s: string) => s.trim()).filter((s: string) => s),
        status: "Active",
      };

      const result = await dispatch(createJob(jobData) as any);
      unwrapResult(result);

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
    setEditDialogOpen(true);
  };

  const handleUpdateJob = async (data: any) => {
    setUpdateError(null);

    if (!data.title || !data.department || !data.location) {
      setUpdateError("Please fill in all required fields (Title, Department, Location)");
      return;
    }

    setUpdating(true);
    try {
      const jobData = {
        title: data.title,
        department: data.department,
        location: data.location,
        description: data.description,
        skills: data.skills.split(",").map((s: string) => s.trim()).filter((s: string) => s),
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

  const content = (
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
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Job</Button>
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

      {/* Create Job Dialog */}
      <JobDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateJob}
        title="Create New Job"
        loading={creating}
        error={createError}
      />

      {/* Edit Job Dialog */}
      <JobDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleUpdateJob}
        initialData={selectedJob}
        title="Edit Job Posting"
        loading={updating}
        error={updateError}
      />

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
  );

  if (isGuest) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 bg-muted/20 py-12 px-4 md:px-8 mt-16">
          {content}
        </main>
      </div>
    );
  }

  const ActiveLayout = isRecruiter ? DashboardLayout : CandidateLayout;
  return <ActiveLayout>{content}</ActiveLayout>;
}
