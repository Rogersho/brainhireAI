"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  Plus,
  Sparkles,
  ClipboardList,
  Video,
  Loader2,
  Star,
} from "lucide-react";
import { toast } from "sonner";

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    applicantId: "",
    title: "Technical Interview",
    roundNumber: "1",
    scheduledAt: "",
    durationMinutes: "45",
    mode: "Video",
    meetingLink: "",
    notes: "",
  });

  // Scorecard dialog
  const [scorecardInterview, setScorecardInterview] = useState<any>(null);
  const [existingScorecards, setExistingScorecards] = useState<any[]>([]);
  const [scoreForm, setScoreForm] = useState({
    technicalScore: 4,
    communicationScore: 4,
    problemSolvingScore: 4,
    cultureFitScore: 4,
    overallRecommendation: "Hire",
    strengthsNotes: "",
    concernsNotes: "",
  });

  // AI Questions dialog
  const [aiQuestions, setAiQuestions] = useState<any[]>([]);
  const [aiInterviewTitle, setAiInterviewTitle] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);

  const loadData = async () => {
    try {
      const [intRes, appRes] = await Promise.all([
        apiFetch<{ data: any[] }>("/interviews"),
        apiFetch<{ data: any[] }>("/applicants"),
      ]);
      setInterviews(intRes.data || []);
      setApplicants(appRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.applicantId || !form.scheduledAt) return;
    setSaving(true);
    try {
      await apiFetch("/interviews", {
        method: "POST",
        body: JSON.stringify({
          applicantId: form.applicantId,
          title: form.title,
          roundNumber: Number(form.roundNumber) || 1,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          durationMinutes: Number(form.durationMinutes) || 45,
          mode: form.mode,
          meetingLink: form.meetingLink,
          notes: form.notes,
        }),
      });
      toast.success("Interview scheduled and candidate notified");
      setScheduleOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule interview");
    } finally {
      setSaving(false);
    }
  };

  const openScorecard = async (interview: any) => {
    setScorecardInterview(interview);
    try {
      const res = await apiFetch<{ data: any[] }>(`/interviews/${interview.id}/scorecards`);
      setExistingScorecards(res.data || []);
    } catch {
      setExistingScorecards([]);
    }
  };

  const handleSubmitScorecard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scorecardInterview) return;
    setSaving(true);
    try {
      await apiFetch(`/interviews/${scorecardInterview.id}/scorecard`, {
        method: "POST",
        body: JSON.stringify(scoreForm),
      });
      toast.success("Interview scorecard submitted");
      setScorecardInterview(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit scorecard");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQuestions = async (interview: any) => {
    setAiInterviewTitle(`${interview.applicantName} — ${interview.title}`);
    setAiQuestions([]);
    setAiOpen(true);
    setLoadingAi(true);
    try {
      const res = await apiFetch<{ data: any[] }>("/ai/interview-questions", {
        method: "POST",
        body: JSON.stringify({
          jobTitle: interview.jobTitle,
          jobDescription: interview.jobDescription || "",
          resumeText: interview.applicantExperience || "",
          roundType: interview.title,
        }),
      });
      setAiQuestions(res.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI interview questions");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Interviews &amp; Scorecards
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule candidate rounds, generate AI interview guides, and collect structured scorecards.
            </p>
          </div>
          <Button size="sm" onClick={() => setScheduleOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Schedule Interview
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : interviews.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-2">
              <CalendarClock className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">No interviews scheduled yet</p>
              <p className="text-xs text-muted-foreground">
                Schedule an interview with any applicant to automatically move them to the Interview stage.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interviews.map((iv) => (
              <Card key={iv.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        <Link href={`/applicants/${iv.applicantId}`} className="hover:underline">
                          {iv.applicantName}
                        </Link>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {iv.jobTitle} · Round {iv.roundNumber}: {iv.title}
                      </CardDescription>
                    </div>
                    <Badge variant={iv.status === "Completed" ? "default" : "secondary"}>
                      {iv.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                    <span>{new Date(iv.scheduledAt).toLocaleString()}</span>
                    <span>· {iv.durationMinutes} min</span>
                    <span className="inline-flex items-center gap-1">
                      <Video className="h-3 w-3" /> {iv.mode}
                    </span>
                    {iv.avgRating !== null && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Star className="h-3 w-3 fill-warning text-warning" /> {iv.avgRating}/5 (
                        {iv.scorecardCount})
                      </span>
                    )}
                  </div>

                  {iv.meetingLink && (
                    <a
                      href={iv.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline block truncate"
                    >
                      {iv.meetingLink}
                    </a>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openScorecard(iv)}>
                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Scorecard ({iv.scorecardCount})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleGenerateQuestions(iv)}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI Questions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Schedule Interview Dialog */}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Interview</DialogTitle>
              <DialogDescription>Invite a candidate and assign round details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSchedule} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Applicant *</Label>
                <Select
                  value={form.applicantId}
                  onValueChange={(v) => setForm({ ...form, applicantId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {applicants.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name} — {a.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Round Title *</Label>
                  <Input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Round #</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.roundNumber}
                    onChange={(e) => setForm({ ...form, roundNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date &amp; Time *</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Video">Video</SelectItem>
                      <SelectItem value="In-Person">In-Person</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Meeting Link or Room</Label>
                <Input
                  placeholder="https://meet.google.com/..."
                  value={form.meetingLink}
                  onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving || !form.applicantId}>
                {saving ? "Scheduling..." : "Schedule & Notify Candidate"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Scorecard Dialog */}
        <Dialog open={Boolean(scorecardInterview)} onOpenChange={() => setScorecardInterview(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Interview Scorecard</DialogTitle>
              <DialogDescription>
                {scorecardInterview?.applicantName} — {scorecardInterview?.title}
              </DialogDescription>
            </DialogHeader>

            {existingScorecards.length > 0 && (
              <div className="space-y-2 border-b border-border pb-3">
                <p className="text-xs font-medium text-muted-foreground">Submitted Evaluations</p>
                {existingScorecards.map((sc) => (
                  <div key={sc.id} className="p-3 rounded-md bg-muted/40 text-xs space-y-1">
                    <div className="flex justify-between font-medium">
                      <span>{sc.interviewerName}</span>
                      <Badge variant="outline">{sc.overallRecommendation}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Tech {sc.technicalScore}/5 · Comm {sc.communicationScore}/5 · Problem{" "}
                      {sc.problemSolvingScore}/5 · Culture {sc.cultureFitScore}/5
                    </p>
                    {sc.strengthsNotes && <p>Strengths: {sc.strengthsNotes}</p>}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmitScorecard} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["technicalScore", "Technical (1-5)"],
                  ["communicationScore", "Communication (1-5)"],
                  ["problemSolvingScore", "Problem Solving (1-5)"],
                  ["cultureFitScore", "Culture Fit (1-5)"],
                ].map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={(scoreForm as any)[key]}
                      onChange={(e) =>
                        setScoreForm({ ...scoreForm, [key]: Number(e.target.value) })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Overall Recommendation</Label>
                <Select
                  value={scoreForm.overallRecommendation}
                  onValueChange={(v) => setScoreForm({ ...scoreForm, overallRecommendation: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strong Hire">Strong Hire</SelectItem>
                    <SelectItem value="Hire">Hire</SelectItem>
                    <SelectItem value="Neutral">Neutral</SelectItem>
                    <SelectItem value="No Hire">No Hire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Strengths</Label>
                <Textarea
                  rows={2}
                  value={scoreForm.strengthsNotes}
                  onChange={(e) => setScoreForm({ ...scoreForm, strengthsNotes: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Concerns / Risks</Label>
                <Textarea
                  rows={2}
                  value={scoreForm.concernsNotes}
                  onChange={(e) => setScoreForm({ ...scoreForm, concernsNotes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Submit Scorecard"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* AI Interview Questions Dialog */}
        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI Interview Guide
              </DialogTitle>
              <DialogDescription>{aiInterviewTitle}</DialogDescription>
            </DialogHeader>
            {loadingAi ? (
              <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Generating tailored questions...
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {aiQuestions.map((q, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-border space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Question {idx + 1}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {q.focusArea}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Look for:</span> {q.whatToLookFor}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
