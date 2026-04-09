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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchApplicantsByJob } from "@/store/slices/applicantsSlice";
import { toast } from "sonner";
import { Eye } from "lucide-react";

export default function JobDetailPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const isCandidate = (session?.user as any)?.role === "Candidate";
  
  const jobs = useAppSelector(state => state.jobs.items);
  const job: any = jobs.find((j: any) => j._id === id);

  const { items: applicants, status: appStatus } = useAppSelector(state => state.applicants);

  const [saved, setSaved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [screening, setScreening] = useState(false);

  useEffect(() => {
    if (id && !isCandidate) {
      dispatch(fetchApplicantsByJob(id as string));
    }
  }, [id, dispatch, isCandidate]);

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

  if (!job) return <DashboardLayout><div className="p-8 text-center text-muted-foreground mt-12 bg-muted/20 border rounded-lg max-w-xl mx-auto">Please navigate back to Jobs and refresh. Data is still loading...</div></DashboardLayout>;

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
          experience: data?.parsedText?.substring(0, 10000) || "Incomplete Resume Data", 
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
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="font-heading text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />Applicants
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{applicants.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {appStatus === 'loading' && <p className="p-4 text-center text-xs text-muted-foreground">Loading...</p>}
                      {applicants.length === 0 && appStatus !== 'loading' && (
                        <p className="p-6 text-center text-xs text-muted-foreground italic">No applicants yet</p>
                      )}
                      {applicants.map((a: any) => (
                        <div key={a._id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2 overflow-hidden">
                             <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                                {a.name.split(" ").map((n: string) => n[0]).join("")}
                             </div>
                             <div className="truncate">
                                <p className="text-xs font-semibold text-foreground truncate">{a.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                   <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                                      <div className="h-full bg-primary" style={{ width: `${a.score || 0}%` }} />
                                   </div>
                                   <span className="text-[9px] text-muted-foreground font-medium">{a.score || 0}%</span>
                                </div>
                             </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link href={`/applicants/${a._id}`}><Eye className="h-3.5 w-3.5 text-muted-foreground" /></Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Button 
                  className="w-full shadow-md font-bold" 
                  onClick={handleRunScreening}
                  disabled={screening || applicants.length === 0}
                >
                  <Brain className={`mr-2 h-4 w-4 ${screening ? 'animate-spin' : ''}`} />
                  {screening ? "AI is Screening..." : "Run AI Screening"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );

  async function handleRunScreening() {
    setScreening(true);
    try {
      const response = await fetch('/api/screening/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        dispatch(fetchApplicantsByJob(id as string));
        toast.success(`AI Screening complete! ${data.data.length} candidates analyzed.`);
      } else {
        toast.error(data.error || "Screening failed");
        console.error('Screening failed:', data.error);
      }
    } catch (error) {
      console.error('Screening error:', error);
    } finally {
      setScreening(false);
    }
  }
}


