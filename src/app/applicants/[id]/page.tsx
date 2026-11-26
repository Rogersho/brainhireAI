"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Briefcase, Brain, Download, CheckCircle, AlertCircle, UserCheck, UserX, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchApplicantById, updateApplicant } from "@/store/slices/applicantsSlice";
import { toast } from "sonner";
import { unwrapResult } from "@reduxjs/toolkit";

export default function CandidateProfilePage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { currentApplicant: candidate, status: appStatus } = useAppSelector((state) => state.applicants);

  useEffect(() => {
    if (id) {
      dispatch(fetchApplicantById(id as string));
    }
  }, [id, dispatch]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!candidate) return;

    try {
      const result = await dispatch(updateApplicant({ id: candidate._id, applicantData: { ...(candidate as any), status: newStatus } }) as any);
      unwrapResult(result);
      toast.success(`Applicant status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleOpenOriginalResume = async () => {
    if (!candidate) return;
    try {
      const res = await apiFetch<{ success: boolean; data: { url: string } }>(
        `/applicants/${candidate._id}/resume`
      );
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
        return;
      }
      toast.error("No original PDF resume found for this candidate.");
    } catch (err: any) {
      toast.error(err.message || "Could not load original resume file");
    }
  };

  const handleDownloadResume = () => {
    if (!candidate || !candidate.experience) {
      toast.error("No resume content available to download.");
      return;
    }
    const blob = new Blob([candidate.experience], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${candidate.name.replace(/\s+/g, '_')}_Resume_Parsed.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Resume downloaded as text file");
  };

  if (appStatus === 'loading') return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Loading candidate profile...</div></DashboardLayout>;
  if (!candidate) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Candidate not found.</div></DashboardLayout>;

  const initials = candidate.name.split(" ").map((n: string) => n[0]).join("");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/applicants"><ArrowLeft className="mr-2 h-4 w-4" />Back to Applicants</Link>
        </Button>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            {/* Profile Header */}
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="font-heading text-2xl font-bold text-foreground">{candidate.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{candidate.location || "Remote"}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="h-14 w-14 rounded-full border-4 border-primary flex items-center justify-center">
                          <span className="font-heading text-lg font-bold text-primary">{candidate.score}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">AI Score</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={
                        candidate.status === "Hired" || candidate.status === "Shortlisted" ? "default" :
                          candidate.status === "Rejected" ? "destructive" :
                            "secondary"
                      } className={candidate.status === "Hired" ? "bg-success hover:bg-success/90" : ""}>
                        {candidate.status}
                      </Badge>
                      <Badge variant="outline">{candidate.source}</Badge>
                      <Badge variant="secondary">{candidate.role}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Experience */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg">Parsed Resume Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {candidate.experience || "Resume text is still being processed or was missing from the upload. Please verify with the candidate's original document."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Skills Assessment Section */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" /> AI Extracted Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {candidate.skills && candidate.skills.length > 0 ? (
                  candidate.skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1 bg-primary/5 text-primary border-primary/10">{skill}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">Run AI Screening to extract skills from the resume.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Evaluation Sidebar */}
          <div className="w-full lg:w-96 space-y-4">
            <div className="sticky top-6 space-y-4">
              <Card className="border-border border-primary/30 shadow-md">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />Actions & Evaluation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Update Status</h4>
                    
                    {candidate.status !== "Hired" && (
                      <Button
                        variant="default"
                        className="w-full bg-success hover:bg-success/90 text-white mb-4 shadow-lg flex items-center justify-center gap-2 font-bold py-6"
                        onClick={() => handleUpdateStatus("Hired")}
                      >
                         HIRE CANDIDATE
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <Button
                        variant={candidate.status === "Shortlisted" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUpdateStatus("Shortlisted")}
                      >
                        <UserCheck className="mr-2 h-4 w-4" /> Shortlist
                      </Button>
                      <Button
                        variant={candidate.status === "Rejected" ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleUpdateStatus("Rejected")}
                      >
                        <UserX className="mr-2 h-4 w-4" /> Decline
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pb-4 border-b border-border mb-4">
                      <Button
                        variant={candidate.status === "In Review" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUpdateStatus("In Review")}
                      >
                        In Review
                      </Button>
                      <Button
                        variant={candidate.status === "Pending" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUpdateStatus("Pending")}
                      >
                        Waitlist
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" /> AI Match Report
                    </h4>
                    <div className="space-y-4">
                      {candidate.aiStrengths && (
                        <div>
                          <p className="text-[10px] font-bold text-success uppercase tracking-wider mb-1 flex items-center gap-1">
                            <CheckCircle className="h-2.5 w-2.5" /> Strengths
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {candidate.aiStrengths}
                          </p>
                        </div>
                      )}

                      {candidate.aiGaps && (
                        <div>
                          <p className="text-[10px] font-bold text-warning uppercase tracking-wider mb-1 flex items-center gap-1">
                            <AlertCircle className="h-2.5 w-2.5" /> Gaps / Risks
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {candidate.aiGaps}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                          Recommendation
                        </p>
                        <p className="text-xs text-foreground font-medium italic">
                          "{candidate.aiRecommendation || 'Further vetting recommended'}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Score Assessment</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">AI Confidence</span>
                        <span className="font-medium text-foreground">{candidate.score}%</span>
                      </div>
                      <Progress value={candidate.score} className="h-1.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {(candidate.resumeUrl || candidate.resumeKey) && (
                <Button variant="default" className="w-full" onClick={handleOpenOriginalResume}>
                  <ExternalLink className="mr-2 h-4 w-4" />View Original Resume (PDF)
                </Button>
              )}

              <Button variant="outline" className="w-full" onClick={handleDownloadResume}>
                <Download className="mr-2 h-4 w-4" />Download CV (Text)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
