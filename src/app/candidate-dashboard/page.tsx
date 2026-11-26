"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { CandidateLayout } from "@/components/CandidateLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Building,
  CheckCircle,
  Clock,
  MapPin,
  Eye,
  Zap,
  Calendar,
  User,
  Brain,
  XCircle,
  Loader2,
  Bookmark,
} from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CandidateDashboard() {
  const { user } = useAuth();
  const userId = user?.id;

  const [applications, setApplications] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      const fetchData = async () => {
        try {
          const [appData, jobData, profileData] = await Promise.all([
            apiFetch<{ data: any[] }>(`/applicants`),
            apiFetch<{ data: any[] }>(`/jobs`),
            apiFetch<{ data: any }>(`/user/profile`).catch(() => ({ data: null })),
          ]);

          setApplications(appData.data || []);
          setAllJobs(jobData.data || []);
          setProfile(profileData.data || null);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [userId]);

  const jobsApplied = applications.length;
  const inReview = applications.filter(
    (a) => a.status === "In Review" || a.status === "Pending"
  ).length;
  const shortlisted = applications.filter(
    (a) => a.status === "Shortlisted" || a.status === "Hired"
  ).length;
  const savedJobsCount = Array.isArray(profile?.savedJobs) ? profile.savedJobs.length : 0;

  const scoredApplications = applications.filter(
    (a) => typeof a.score === "number" && a.score > 0
  );
  const avgScore =
    scoredApplications.length > 0
      ? Math.round(
          scoredApplications.reduce((acc, curr) => acc + curr.score, 0) /
            scoredApplications.length
        )
      : null;

  const hasResume = Boolean(profile?.resumeText);
  const extractedSkillsCount = Array.isArray(profile?.skills) ? profile.skills.length : 0;

  const recentApplications = applications.slice(0, 3);

  const recommendedJobs = allJobs
    .filter((j) => {
      const jId = j._id || j.id;
      return !applications.some((a) => {
        const appliedJobId = typeof a.jobId === "object" ? a.jobId?._id || a.jobId?.id : a.jobId;
        return appliedJobId === jId;
      });
    })
    .slice(0, 3);

  const chartData = useMemo(() => {
    const today = new Date();
    const countsByDate = new Map<string, number>();

    applications.forEach((app) => {
      if (!app.createdAt) return;
      const key = toLocalDateKey(new Date(app.createdAt));
      countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
    });

    const result: Array<{ name: string; date: string; applications: number }> = [];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const key = toLocalDateKey(d);
      const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
      result.push({
        name: dayLabel,
        date: key,
        applications: countsByDate.get(key) || 0,
      });
    }
    return result;
  }, [applications]);

  const totalLast7Days = useMemo(
    () => chartData.reduce((sum, item) => sum + item.applications, 0),
    [chartData]
  );

  if (loading) {
    return (
      <CandidateLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              Welcome back, {user?.name || "Candidate"}
            </h1>
            <p className="text-muted-foreground mt-2">
              Here is your real-time job search activity.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/candidate-dashboard/profile">
                <User className="mr-2 h-4 w-4" /> Edit Profile
              </Link>
            </Button>
            <Button asChild>
              <Link href="/jobs">
                <Briefcase className="mr-2 h-4 w-4" /> Find New Roles
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border shadow-sm hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Jobs Applied</p>
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold">{jobsApplied}</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {shortlisted > 0 ? `${shortlisted} shortlisted` : "Total submitted"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">In Review</p>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold">{inReview}</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pending &amp; active review</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Saved Jobs</p>
                <Bookmark className="h-4 w-4 text-info" />
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold">{savedJobsCount}</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {savedJobsCount === 1 ? "Bookmarked role" : "Bookmarked roles"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-primary/5 border-primary/20 relative overflow-hidden">
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-primary">Avg AI Resume Score</p>
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold text-primary">
                  {avgScore !== null ? `${avgScore}/100` : "—"}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {avgScore !== null
                  ? `Across ${scoredApplications.length} screened ${scoredApplications.length === 1 ? "application" : "applications"}`
                  : hasResume
                  ? "CV uploaded · Awaiting screening"
                  : "No screened applications yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-heading">
                  Application Activity (Last 7 Days)
                </CardTitle>
                <CardDescription>
                  {totalLast7Days === 0
                    ? "No applications submitted in the past 7 days"
                    : `${totalLast7Days} ${totalLast7Days === 1 ? "application" : "applications"} submitted in the past 7 days`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {totalLast7Days === 0 ? (
                  <div className="h-[250px] w-full mt-2 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-center px-4">
                    <Briefcase className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-medium text-foreground">No recent activity yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Your daily application submissions over the last 7 days will appear here automatically.
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link href="/jobs">Explore Open Roles</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          dy={10}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          dx={-10}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))" }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                          }}
                        />
                        <Bar
                          dataKey="applications"
                          name="Applications"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-heading">Recent Applications</CardTitle>
                  <CardDescription>Track the status of jobs you&apos;ve applied for</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/candidate-dashboard/applications">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentApplications.length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
                    You haven&apos;t applied to any jobs yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentApplications.map((app) => (
                      <div
                        key={app._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                            <Building className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {app.jobId?.title || app.role || "Role Unavailable"}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center">
                                <Building className="mr-1 h-3 w-3" /> {app.jobId?.department || "N/A"}
                              </span>
                              <span className="flex items-center">
                                <MapPin className="mr-1 h-3 w-3" /> {app.jobId?.location || "N/A"}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="mr-1 h-3 w-3" />{" "}
                                {new Date(app.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                          <Badge
                            variant={
                              app.status === "Shortlisted" || app.status === "Hired"
                                ? "default"
                                : app.status === "Rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {(app.status === "Shortlisted" || app.status === "Hired") && (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            )}
                            {app.status === "Pending" && <Clock className="mr-1 h-3 w-3" />}
                            {app.status === "Rejected" && <XCircle className="mr-1 h-3 w-3" />}
                            {app.status === "In Review" && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            {app.status}
                          </Badge>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/jobs/${app.jobId?._id || app.jobId?.id || ""}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                  Live Roles Available
                </CardTitle>
                <CardDescription>
                  {recommendedJobs.length === 0
                    ? "No open roles left to apply for"
                    : `${recommendedJobs.length} open ${recommendedJobs.length === 1 ? "role" : "roles"} available`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recommendedJobs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No new jobs available at the moment.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recommendedJobs.map((job) => (
                      <div
                        key={job._id}
                        className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors flex flex-col gap-2 relative overflow-hidden group"
                      >
                        <div className="absolute top-0 right-0 p-1 px-2 bg-success/10 text-success text-xs font-bold rounded-bl-lg">
                          OPEN
                        </div>
                        <h4 className="font-semibold font-heading text-sm pr-10 group-hover:text-primary transition-colors">
                          {job.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {job.department} • {job.location}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Button size="sm" variant="secondary" className="h-7 text-xs px-3" asChild>
                            <Link href={`/jobs/${job._id}`}>Apply</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full text-xs" asChild>
                      <Link href="/jobs">View Job Board</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm overflow-hidden bg-muted/30 relative">
              <CardContent className="p-6">
                <Brain className="absolute -bottom-4 -right-4 h-24 w-24 text-foreground/5" />
                <h3 className="font-heading font-semibold text-lg mb-2 relative z-10">
                  AI Profile Status
                </h3>
                {!hasResume ? (
                  <div className="relative z-10 space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Upload your master CV so Hoobe HR AI can extract your skills and evaluate your fit on future applications.
                    </p>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/candidate-dashboard/profile">Upload Master CV</Link>
                    </Button>
                  </div>
                ) : avgScore !== null ? (
                  <p className="text-sm text-muted-foreground relative z-10 leading-relaxed">
                    Your screened applications average{" "}
                    <span className="font-semibold text-foreground">{avgScore}/100</span> with{" "}
                    <span className="font-semibold text-foreground">{extractedSkillsCount}</span>{" "}
                    extracted skills on your profile.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground relative z-10 leading-relaxed">
                    Your CV is saved with{" "}
                    <span className="font-semibold text-foreground">{extractedSkillsCount}</span>{" "}
                    extracted skills. Apply to open roles to receive your first AI screening score.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CandidateLayout>
  );
}
