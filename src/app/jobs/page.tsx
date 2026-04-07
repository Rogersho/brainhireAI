"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const jobs = [
  { id: 1, title: "Senior Frontend Developer", department: "Engineering", location: "Remote", applicants: 87, status: "Active", posted: "3 days ago" },
  { id: 2, title: "Data Scientist", department: "AI/ML", location: "New York", applicants: 124, status: "Active", posted: "1 week ago" },
  { id: 3, title: "Product Manager", department: "Product", location: "San Francisco", applicants: 56, status: "Active", posted: "2 days ago" },
  { id: 4, title: "UX Designer", department: "Design", location: "Remote", applicants: 43, status: "Paused", posted: "2 weeks ago" },
  { id: 5, title: "Backend Engineer", department: "Engineering", location: "Austin", applicants: 92, status: "Active", posted: "5 days ago" },
  { id: 6, title: "DevOps Engineer", department: "Infrastructure", location: "Remote", applicants: 38, status: "Closed", posted: "1 month ago" },
];

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const filtered = jobs.filter(j => j.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Job Postings</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your open positions</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Create Job</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading">Create New Job</DialogTitle>
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
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((job) => (
            <Card key={job.id} className="border-border hover:border-primary/30 transition-colors">
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
                    <Users className="h-4 w-4" />
                    {job.applicants} applicants
                  </div>
                  <span className="text-xs text-muted-foreground">{job.posted}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                  <Link href={`/jobs/${job.id}`}>
                    <Eye className="mr-2 h-3 w-3" />View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
