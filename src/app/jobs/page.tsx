"use client";

import { useSession } from "next-auth/react";
import { CandidateLayout } from "@/components/CandidateLayout";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Eye } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchJobs } from "@/store/slices/jobsSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function JobsPage() {
  const { data: session } = useSession();
  const isCandidate = (session?.user as any)?.role === "Candidate";

  const dispatch = useAppDispatch();
  const { items: jobs, status } = useAppSelector((state) => state.jobs);
  const [search, setSearch] = useState("");

  const Layout = isCandidate ? CandidateLayout : DashboardLayout;

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchJobs());
    }
  }, [status, dispatch]);

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
            <Dialog>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Create Job</Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading">Create New Job</DialogTitle>
                <DialogDescription className="sr-only">Fill out the details to create a new job posting.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input placeholder="e.g. Senior Frontend Developer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input placeholder="Engineering" />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input placeholder="Remote" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the role, responsibilities, and requirements..." rows={5} />
                </div>
                <div className="space-y-2">
                  <Label>Required Skills (comma-separated)</Label>
                  <Input placeholder="React, TypeScript, Node.js" />
                </div>
                <Button className="w-full">Publish Job</Button>
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
                        {/* Placeholder for applicant count via API */} applicants
                      </>
                    ) : (
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">Full-Time</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                  <Link href={`/jobs/${job._id}`}>
                    <Eye className="mr-2 h-3 w-3" /> {isCandidate ? "View Details & Apply" : "View Details"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
