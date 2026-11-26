"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth, isHrRole, isHiringRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Target, Plus, Sparkles, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PerformancePage() {
  const { user } = useAuth();
  const hrAccess = isHrRole(user?.role);
  const canReview = isHiringRole(user?.role);

  const [cycles, setCycles] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [cycleOpen, setCycleOpen] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    name: `H2 ${new Date().getFullYear()} Performance Review`,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
  });

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", metricTarget: "", dueDate: "" });

  const [activeReview, setActiveReview] = useState<{ review: any; mode: "self" | "manager" } | null>(
    null
  );
  const [rating, setRating] = useState(4);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [cRes, rRes, gRes] = await Promise.all([
        apiFetch<{ data: any[] }>("/performance/cycles"),
        apiFetch<{ data: any[] }>("/performance/reviews"),
        apiFetch<{ data: any[] }>("/performance/goals"),
      ]);
      setCycles(cRes.data || []);
      setReviews(rRes.data || []);
      setGoals(gRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load performance workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleLaunchCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ message: string }>("/performance/cycles", {
        method: "POST",
        body: JSON.stringify(cycleForm),
      });
      toast.success(res.message || "Review cycle launched");
      setCycleOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to launch review cycle");
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/performance/goals", {
        method: "POST",
        body: JSON.stringify({
          title: goalForm.title,
          metricTarget: goalForm.metricTarget,
          dueDate: goalForm.dueDate || null,
        }),
      });
      toast.success("Goal added");
      setGoalOpen(false);
      setGoalForm({ title: "", metricTarget: "", dueDate: "" });
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to create goal");
    }
  };

  const handleUpdateGoal = async (id: string, progressPercent: number) => {
    try {
      await apiFetch(`/performance/goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ progressPercent }),
      });
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to update goal");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReview) return;
    setSubmitting(true);
    try {
      if (activeReview.mode === "self") {
        await apiFetch(`/performance/reviews/${activeReview.review.id}/self`, {
          method: "PATCH",
          body: JSON.stringify({ selfRating: rating, selfComments: comments }),
        });
        toast.success("Self-review submitted");
      } else {
        await apiFetch(`/performance/reviews/${activeReview.review.id}/manager`, {
          method: "PATCH",
          body: JSON.stringify({
            managerRating: rating,
            managerComments: comments,
            finalRating: rating,
            generateAiSummary: true,
          }),
        });
        toast.success("Manager review completed with AI synthesis");
      }
      setActiveReview(null);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Performance &amp; OKRs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Run structured review cycles, track employee goals, and generate AI review syntheses.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Goal
            </Button>
            {hrAccess && (
              <Button size="sm" onClick={() => setCycleOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Launch Cycle
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="reviews">
            <TabsList>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              <TabsTrigger value="goals">Goals &amp; OKRs ({goals.length})</TabsTrigger>
              <TabsTrigger value="cycles">Review Cycles ({cycles.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="mt-4 space-y-4">
              {reviews.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center space-y-2">
                    <Target className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">No performance reviews yet</p>
                    <p className="text-xs text-muted-foreground">
                      Launch a review cycle to automatically assign reviews for all active employees.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                reviews.map((rev) => (
                  <Card key={rev.id} className="border-border">
                    <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{rev.employeeName}</CardTitle>
                        <CardDescription className="text-xs">
                          {rev.cycleName} · {rev.jobTitle}
                          {rev.departmentName ? ` · ${rev.departmentName}` : ""}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {rev.finalRating && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                            <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {rev.finalRating}/5
                          </span>
                        )}
                        <Badge variant={rev.status === "Completed" ? "default" : "secondary"}>
                          {rev.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {rev.selfComments && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Self ({rev.selfRating}/5):</span>{" "}
                          {rev.selfComments}
                        </p>
                      )}
                      {rev.managerComments && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Manager ({rev.managerRating}/5):
                          </span>{" "}
                          {rev.managerComments}
                        </p>
                      )}
                      {rev.aiSummary && (
                        <div className="p-3 rounded-md bg-muted/40 border border-border text-xs space-y-1">
                          <p className="font-medium flex items-center gap-1 text-foreground">
                            <Sparkles className="h-3.5 w-3.5" /> AI Synthesis
                          </p>
                          <p className="text-muted-foreground leading-relaxed">{rev.aiSummary}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        {rev.employeeUserId === user?.id && rev.status !== "Completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRating(rev.selfRating || 4);
                              setComments(rev.selfComments || "");
                              setActiveReview({ review: rev, mode: "self" });
                            }}
                          >
                            Submit Self-Review
                          </Button>
                        )}
                        {canReview && rev.status !== "Completed" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setRating(rev.managerRating || 4);
                              setComments(rev.managerComments || "");
                              setActiveReview({ review: rev, mode: "manager" });
                            }}
                          >
                            Complete Manager Review
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="goals" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.length === 0 ? (
                <Card className="border-dashed md:col-span-2">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No goals or OKRs defined yet.
                  </CardContent>
                </Card>
              ) : (
                goals.map((g) => (
                  <Card key={g.id} className="border-border">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{g.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {g.employeeName} {g.metricTarget ? `· Target: ${g.metricTarget}` : ""}
                          </p>
                        </div>
                        <Badge variant={g.status === "Completed" ? "default" : "secondary"}>
                          {g.status}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{g.progressPercent}%</span>
                        </div>
                        <Progress value={g.progressPercent} className="h-1.5" />
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        {[25, 50, 75, 100].map((pct) => (
                          <Button
                            key={pct}
                            size="sm"
                            variant={g.progressPercent === pct ? "default" : "outline"}
                            className="h-7 text-xs px-2.5"
                            onClick={() => handleUpdateGoal(g.id, pct)}
                          >
                            {pct}%
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="cycles" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {cycles.map((c) => (
                <Card key={c.id} className="border-border">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <Badge variant="outline">{c.status}</Badge>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <p>
                      {new Date(c.startDate).toLocaleDateString()} –{" "}
                      {new Date(c.endDate).toLocaleDateString()}
                    </p>
                    <p className="font-medium text-foreground">
                      {c.completedReviews} / {c.totalReviews} reviews completed
                    </p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={cycleOpen} onOpenChange={setCycleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Launch Review Cycle</DialogTitle>
              <DialogDescription>
                Creates review forms for every active employee automatically.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLaunchCycle} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Cycle Name *</Label>
                <Input
                  required
                  value={cycleForm.name}
                  onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={cycleForm.startDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={cycleForm.endDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Launch Cycle
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Goal / OKR</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGoal} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Goal Title *</Label>
                <Input
                  required
                  placeholder="Reduce onboarding turnaround time by 30%"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Metric Target</Label>
                  <Input
                    placeholder="Under 5 business days"
                    value={goalForm.metricTarget}
                    onChange={(e) => setGoalForm({ ...goalForm, metricTarget: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={goalForm.dueDate}
                    onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Save Goal
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(activeReview)} onOpenChange={() => setActiveReview(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {activeReview?.mode === "self" ? "Submit Self-Review" : "Complete Manager Review"}
              </DialogTitle>
              <DialogDescription>{activeReview?.review?.employeeName}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitReview} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Rating (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  required
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Feedback / Reflection</Label>
                <Textarea
                  rows={5}
                  required
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Save Review"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
