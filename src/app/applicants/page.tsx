"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Eye, UploadCloud, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchApplicants, fetchMyApplicants, updateApplicant } from "@/store/slices/applicantsSlice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { unwrapResult } from "@reduxjs/toolkit";

export default function ApplicantsPage() {
  const { user } = useAuth();
  const isRecruiter = user?.role === "Recruiter";

  const dispatch = useAppDispatch();
  const { items: applicantsRaw, status } = useAppSelector((state) => state.applicants);
  const applicants = applicantsRaw as any[];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsedText, setParsedText] = useState("");

  useEffect(() => {
    if (status === 'idle') {
      // Recruiters see only their applicants, others see all
      if (isRecruiter) {
        dispatch(fetchMyApplicants());
      } else {
        dispatch(fetchApplicants());
      }
    }
  }, [status, dispatch, isRecruiter]);

  const filtered = applicants.filter((a: any) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await apiFetch<{ data: { parsedText: string } }>("/upload", {
        method: "POST",
        body: formData,
      });
      setParsedText(data.parsedText);
    } catch (error: any) {
      toast.error(error.message || "Failed to parse document");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const applicant = applicants.find((a: any) => a._id === id);
      if (!applicant) return;
      const result = await dispatch(updateApplicant({ id, applicantData: { ...(applicant as any), status: newStatus } }) as any);
      unwrapResult(result);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Applicants</h1>
            <p className="text-muted-foreground text-sm mt-1">{isRecruiter ? "Manage candidates for your posted jobs" : "Browse all candidates"}</p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload Resume
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Candidate Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {parsedText ? (
                  <div className="bg-success/10 p-4 rounded-md border border-success/20 flex flex-col items-center">
                    <CheckCircle className="h-8 w-8 text-success mb-2" />
                    <p className="text-sm font-medium text-success text-center">Resume parsed successfully!</p>
                    <p className="text-xs text-muted-foreground mt-2 text-center">Extracted {parsedText.length} characters.</p>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <Button
                      className="w-full"
                      onClick={handleUpload}
                      disabled={!file || uploading}
                    >
                      {uploading ? "Extracting text..." : "Parse Document"}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search applicants..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Shortlisted">Shortlisted</SelectItem>
              <SelectItem value="In Review">In Review</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Candidate</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4 hidden sm:table-cell">Applied For</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4 hidden md:table-cell">Source</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">AI Score</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3"></th>
              </tr>
            </thead>
            <tbody>
              {status === 'loading' && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Loading applicants...</td></tr>}
              {filtered.map((a: any) => (
                <tr key={a._id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                        {a.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          {a.experience?.substring(0, 150)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm text-muted-foreground hidden sm:table-cell">{a.role}</td>
                  <td className="py-3 pr-4 hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">{a.source}</Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${a.score}%` }} />
                      </div>
                      <span className="text-sm font-medium text-foreground w-6">{a.score}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {isRecruiter ? (
                      <Select value={a.status} onValueChange={(val) => handleUpdateStatus(a._id, val)}>
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                          <SelectItem value="In Review">In Review</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={
                        a.status === "Shortlisted" ? "default" :
                          a.status === "Rejected" ? "destructive" :
                            "secondary"
                      } className="text-xs">
                        {a.status}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/applicants/${a._id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
