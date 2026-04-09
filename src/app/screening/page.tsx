"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Play, CheckCircle, Star, TrendingUp, Minus, RefreshCw, AlertCircle, Eye, UserX } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchJobs } from "@/store/slices/jobsSlice";
import { fetchApplicantsByJob } from "@/store/slices/applicantsSlice";
import { toast } from "sonner";
import Link from "next/link";

export default function ScreeningPage() {
  const dispatch = useAppDispatch();
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const jobs = useAppSelector((state) => state.jobs.items as any[]);
  const applicants = useAppSelector((state) => state.applicants.items as any[]);
  const applicantsStatus = useAppSelector((state) => state.applicants.status);

  // Fetch jobs on component mount
  useEffect(() => {
    dispatch(fetchJobs() as any);
  }, [dispatch]);

  // Fetch applicants when job is selected
  useEffect(() => {
    if (selectedJobId) {
      dispatch(fetchApplicantsByJob(selectedJobId) as any);
    }
  }, [selectedJobId, dispatch]);

  // Set initial selected job
  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0]._id);
    }
  }, [jobs, selectedJobId]);

  const handleRunScreening = async () => {
    if (!selectedJobId) return;
    
    setRunning(true);
    try {
      const response = await fetch('/api/screening/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJobId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh applicants
        dispatch(fetchApplicantsByJob(selectedJobId) as any);
        setCompleted(true);
        toast.success(`Broad screening complete for ${data.data.length} candidates.`);
      } else {
        toast.error(data.error || "Screening failed");
        console.error('Screening failed:', data.error);
      }
    } catch (error) {
      console.error('Screening error:', error);
    } finally {
      setRunning(false);
    }
  };

  const shortlistedApplicants = applicants.filter((a) => a.status === "Shortlisted");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">AI Screening</h1>
            <p className="text-muted-foreground text-sm mt-1">Evaluate and rank applicants with AI</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job: any) => (
                  <SelectItem key={job._id} value={job._id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleRunScreening} disabled={applicantsStatus === "loading"}>
              {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {running ? "Screening..." : "Run Screening"}
            </Button>
          </div>
        </div>

        {completed && applicants.length > 0 && (
          <>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Screening Complete</p>
                    <p className="text-xs text-muted-foreground">{applicants.length} applicants screened · {shortlistedApplicants.length} recommended</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30 rounded-t-lg">
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">Candidate</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-2">Strengths</div>
              <div className="col-span-2">Gaps</div>
              <div className="col-span-1">Verdict</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            <div className="divide-y divide-border border-x border-b border-border rounded-b-lg overflow-hidden bg-card">
              {[...applicants]
                .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                .map((applicant: any, index: number) => {
                  const score = applicant.score || 0;
                  
                  // Map score to verdict and color
                  let verdict = "Pending";
                  let verdictColor = "bg-muted text-muted-foreground";
                  if (score >= 85) { verdict = "Strong Hire"; verdictColor = "bg-success/10 text-success border-success/20"; }
                  else if (score >= 70) { verdict = "Hire"; verdictColor = "bg-primary/10 text-primary border-primary/20"; }
                  else if (score >= 50) { verdict = "Maybe"; verdictColor = "bg-warning/10 text-warning border-warning/20"; }
                  else if (score > 0) { verdict = "No Hire"; verdictColor = "bg-destructive/10 text-destructive border-destructive/20"; }

                  // Progress bar color
                  const progressColor = score >= 85 ? "bg-success" : score >= 70 ? "bg-primary" : score >= 50 ? "bg-warning" : "bg-destructive";

                  return (
                    <div key={applicant._id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors group">
                      {/* Mobile Rank Label */}
                      <div className="md:col-span-1 flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>

                      {/* Candidate info */}
                      <div className="md:col-span-3">
                        <p className="text-sm font-bold text-foreground leading-tight">{applicant.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{applicant.userId?.email || applicant.source}</p>
                      </div>

                      {/* Score Analysis */}
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-3">
                           <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                             <div className={`h-full ${progressColor} transition-all duration-1000`} style={{ width: `${score}%` }} />
                           </div>
                           <span className="text-xs font-bold text-foreground w-5">{score}</span>
                        </div>
                      </div>

                      {/* Strengths - Shortened */}
                      <div className="md:col-span-2">
                        <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                          {applicant.aiStrengths || "No data"}
                        </p>
                      </div>

                      {/* Gaps - Shortened */}
                      <div className="md:col-span-2">
                        <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                          {applicant.aiGaps || "No data"}
                        </p>
                      </div>

                      {/* Verdict Badge */}
                      <div className="md:col-span-1">
                        <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full border text-center ${verdictColor} whitespace-nowrap`}>
                          {verdict}
                        </div>
                      </div>

                      {/* Detail Link */}
                      <div className="md:col-span-1 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" asChild>
                           <Link href={`/applicants/${applicant._id}`}>
                             <Eye className="h-4 w-4" />
                           </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {applicantsStatus === "loading" && (
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Loading applicants...</p>
            </CardContent>
          </Card>
        )}

        {completed && applicants.length === 0 && applicantsStatus !== "loading" && (
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No applicants yet</p>
              <p className="text-xs text-muted-foreground mt-1">Select a job to see applicants</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
