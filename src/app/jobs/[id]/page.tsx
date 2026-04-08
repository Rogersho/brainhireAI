"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CandidateLayout } from "@/components/CandidateLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Users, MapPin, Calendar, Brain, Heart, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

export default function JobDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const isCandidate = (session?.user as any)?.role === "Candidate";
  
  const jobs = useAppSelector(state => state.jobs.items);
  const job: any = jobs.find((j: any) => j._id === id);

  const [saved, setSaved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (session?.user && isCandidate && id) {
      const checkAppliedStatus = async () => {
        try {
          const res = await fetch(`/api/applicants?jobId=${id}&userId=${(session.user as any).id}`);
          const { data } = await res.json();
          if (data && data.length > 0) {
            setApplied(true);
          }
        } catch(e) {
          console.error("Failed to check application status:", e);
        }
      };
      checkAppliedStatus();
    }
  }, [session, isCandidate, id]);

  if (!job) return <div className="p-8 text-center text-muted-foreground mt-12 bg-muted/20 border rounded-lg max-w-xl mx-auto">Please navigate back to Jobs and refresh. Data is still loading to Redux.</div>;

  const Layout = isCandidate ? CandidateLayout : DashboardLayout;

  const handleSaveJob = async () => {
    setSaved(!saved);
    await fetch('/api/user/saved-jobs', {
       method: 'POST', 
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ jobId: id })
    });
  };

  const handleApply = async () => {
    if (!file) return;
    setApplying(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const { data } = await uploadRes.json();
      
      await fetch("/api/applicants", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: session?.user?.name || "Candidate User",
          jobId: job._id,
          userId: (session?.user as any)?.id,
          role: job.title,
          experience: data?.parsedText?.substring(0, 500) || "No parseable text", 
          source: "Job Board",
          skills: []
        })
      });

      setApplying(false);
      setApplied(true);
    } catch (e) {
      console.error(e);
      setApplying(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/jobs"><ArrowLeft className="mr-2 h-4 w-4" />Back to Jobs</Link>
        </Button>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <Card className="border-border shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">{job.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-4 w-4 text-primary" />{job.department}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" />{job.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-primary" />{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{job.status}</Badge>
                </div>

                <div className="mt-8 pt-6 border-t">
                  <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Role Overview</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
                </div>

                <div className="mt-8">
                  <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Minimum Qualifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s: string) => (
                      <Badge key={s} variant="secondary" className="px-3 py-1 font-medium">{s}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-full lg:w-80 space-y-4">
            {isCandidate ? (
              <Card className="border-border shadow-md sticky top-6 border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-16 w-16 bg-primary/10 rounded-bl-full" />
                <CardHeader>
                  <CardTitle className="font-heading text-xl relative z-10">Interested?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                  {applied ? (
                    <div className="bg-success/10 p-4 rounded-xl border border-success/20 flex flex-col items-center shadow-inner">
                     <CheckCircle className="h-10 w-10 text-success mb-3" />
                     <p className="text-base font-bold text-success text-center">Application Sent!</p>
                     <p className="text-xs text-muted-foreground mt-1 text-center mb-4">The recruiter will review your profile shortly.</p>
                     <Button className="w-full" variant="outline" asChild><Link href="/candidate-dashboard/applications">Track Status</Link></Button>
                    </div>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full shadow-md font-bold" size="lg">Apply Now</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl">Apply for {job.title}</DialogTitle>
                          <DialogDescription className="text-sm text-muted-foreground">Submit your PDF resume to complete your application.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                          <div className="p-4 bg-muted rounded-lg border border-border space-y-2">
                             <p className="font-medium text-sm">Upload Resume (PDF)</p>
                             <input 
                              type="file" accept="application/pdf"
                              onChange={(e) => setFile(e.target.files?.[0] || null)}
                              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer focus:outline-none"
                             />
                             <p className="text-xs text-muted-foreground mt-1">We'll use our AI engine to parse your skills upon submission.</p>
                          </div>
                          <Button className="w-full font-bold" onClick={handleApply} disabled={!file || applying}>
                             {applying ? "Parsing Resume & Submitting..." : "Submit Application"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  {!applied && (
                    <Button variant="outline" className="w-full" onClick={handleSaveJob}>
                      <Heart className={`mr-2 h-4 w-4 transition-colors ${saved ? 'fill-destructive text-destructive' : ''}`} />
                      {saved ? "Saved to Wishlist" : "Save for Later"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-heading text-base flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />Applicants Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">Run screening to rank applicants</p>
                  </CardContent>
                </Card>
                <Button className="w-full shadow-md font-bold" asChild>
                  <Link href="/screening"><Brain className="mr-2 h-4 w-4" />Run AI Screening</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
