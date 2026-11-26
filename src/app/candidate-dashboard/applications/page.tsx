"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { CandidateLayout } from "@/components/CandidateLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  ExternalLink,
  Building,
  MapPin,
  CalendarClock,
  FileSignature,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      const [appRes, intRes, offRes] = await Promise.all([
        apiFetch<{ data: any[] }>("/applicants"),
        apiFetch<{ data: any[] }>("/interviews").catch(() => ({ data: [] })),
        apiFetch<{ data: any[] }>("/offers").catch(() => ({ data: [] })),
      ]);
      setApplications(appRes.data || []);
      setInterviews(intRes.data || []);
      setOffers(offRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleOfferDecision = async (offerId: string, decision: "Accepted" | "Declined") => {
    setRespondingId(offerId);
    try {
      await apiFetch(`/offers/${offerId}/respond`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      toast.success(
        decision === "Accepted"
          ? "Offer accepted! Welcome to the team."
          : "Offer declined."
      );
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to respond to offer");
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <CandidateLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Application Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor applications, upcoming interviews, and official job offers in real time.
          </p>
        </div>

        {/* Active Job Offers */}
        {offers.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <FileSignature className="h-5 w-5" /> Official Job Offers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 rounded-lg border border-border bg-background space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground">{offer.jobTitle}</h4>
                      <p className="text-xs text-muted-foreground">
                        {offer.currency} {offer.proposedSalary.toLocaleString()} / yr ·{" "}
                        {offer.employmentType} · Start date{" "}
                        {new Date(offer.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        offer.status === "Accepted"
                          ? "default"
                          : offer.status === "Declined"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {offer.status}
                    </Badge>
                  </div>
                  {offer.offerLetterText && (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-muted/40 p-3 rounded border max-h-48 overflow-y-auto">
                      {offer.offerLetterText}
                    </pre>
                  )}
                  {offer.status === "Sent" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={respondingId === offer.id}
                        onClick={() => handleOfferDecision(offer.id, "Accepted")}
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" /> Accept Offer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={respondingId === offer.id}
                        onClick={() => handleOfferDecision(offer.id, "Declined")}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Scheduled Interviews */}
        {interviews.length > 0 && (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <CalendarClock className="h-5 w-5" /> Scheduled Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {interviews.map((iv) => (
                <div
                  key={iv.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {iv.jobTitle} — Round {iv.roundNumber}: {iv.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(iv.scheduledAt).toLocaleString()} · {iv.durationMinutes} min ·{" "}
                      {iv.mode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{iv.status}</Badge>
                    {iv.meetingLink && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer">
                          Join
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading">My Applications</CardTitle>
            <CardDescription>
              You have submitted {applications.length} applications through Hoobe HR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                <p>Loading your applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 border border-dashed border-border rounded-xl shadow-inner">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="font-heading font-semibold text-xl">No applications yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
                  You haven&apos;t uploaded your CV or applied to any roles yet. Browse our job
                  board to find your next opportunity.
                </p>
                <Button size="lg" className="shadow-md" asChild>
                  <Link href="/jobs">Browse Jobs</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app._id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-lg border border-border bg-card hover:border-primary/30 transition-all shadow-sm group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <Building className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <h4 className="font-heading font-semibold text-foreground text-lg">
                          {app.jobId?.title || app.role || "Unknown Role"}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center">
                            <Building className="mr-1 h-3 w-3" />{" "}
                            {app.jobId?.department || "Department N/A"}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="mr-1 h-3 w-3" />{" "}
                            {app.jobId?.location || "Location N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0 flex flex-col md:items-end gap-3 w-full md:w-auto">
                      <div className="flex items-center justify-between md:justify-end w-full gap-4">
                        <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                          Applied: {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                        <Badge
                          variant={
                            app.status === "Shortlisted" ||
                            app.status === "Hired" ||
                            app.status === "Offer"
                              ? "default"
                              : app.status === "Rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className="px-3 py-1"
                        >
                          {(app.status === "Shortlisted" || app.status === "Hired") && (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          )}
                          {app.status === "Rejected" && <XCircle className="mr-1 h-3 w-3" />}
                          {app.status === "Pending" && <Clock className="mr-1 h-3 w-3" />}
                          {app.status === "In Review" && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {app.status}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" className="w-full md:w-auto" asChild>
                        <Link href={`/jobs/${app.jobId?._id || app.jobId?.id || ""}`}>
                          <ExternalLink className="mr-2 h-3 w-3" /> View Source Job
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
    </CandidateLayout>
  );
}
