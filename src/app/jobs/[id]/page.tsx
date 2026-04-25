"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CandidateLayout } from "@/components/CandidateLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Users, MapPin, Calendar, Brain, Heart, CheckCircle, Eye, UploadCloud, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchApplicantsByJob } from "@/store/slices/applicantsSlice";
import { toast } from "sonner";
import { Navbar } from "@/components/landing/Navbar";

export default function JobDetailPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { data: session, status: sessionStatus } = useSession();
  
  const isGuest = sessionStatus === "unauthenticated";
  const isRecruiter = (session?.user as any)?.role === "Recruiter";
  const isCandidate = (session?.user as any)?.role === "Candidate" || isGuest;
  
  const jobs = useAppSelector(state => state.jobs.items);
  const job: any = jobs.find((j: any) => j._id === id);

  const { items: applicants, status: appStatus } = useAppSelector(state => state.applicants);

  const [saved, setSaved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [screening, setScreening] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);

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

  const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isGuest) {
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar />
          <main className="flex-1 bg-muted/20 py-8 px-4 md:px-8">
            {children}
          </main>
        </div>
      );
    }
    const ActiveLayout = isRecruiter ? DashboardLayout : CandidateLayout;
    return <ActiveLayout>{children}</ActiveLayout>;
  };

  if (!job) return <LayoutWrapper><div className="p-8 text-center text-muted-foreground mt-12 bg-muted/20 border rounded-lg max-w-xl mx-auto">Please navigate back to Jobs and refresh. Data is still loading...</div></LayoutWrapper>;

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
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Failed to process resume. Please try again or check your AI API keys.");
      }
      
      const parsedText = uploadData.data?.parsedText;
      
      const applicantRes = await fetch("/api/applicants", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: session?.user?.name || "Candidate User",
          jobId: job._id,
          userId: (session?.user as any)?.id,
          role: job.title,
          experience: parsedText?.substring(0, 10000) || "Incomplete Resume Data", 
          source: "Job Board",
          skills: []
        })
      });

      const applicantData = await applicantRes.json();

      if (!applicantRes.ok) {
        throw new Error(applicantData.error || "Failed to submit application. Please try again.");
      }

      toast.success("Application submitted successfully!");
      setApplied(true);
    } catch (e: any) {
      console.error("Application Error:", e);
      toast.error(e.message || "An unexpected error occurred during application.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <LayoutWrapper>
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
                  ) : isGuest ? (
                    <Button className="w-full shadow-md font-bold" size="lg" asChild>
                      <Link href={`/login?callbackUrl=/jobs/${id}`}>Login to Apply</Link>
                    </Button>
                  ) : (
                      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full shadow-md font-bold" size="lg">Apply Now</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-xl">Apply for {job.title}</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">Submit your PDF resume to complete your application.</DialogDescription>
                          </DialogHeader>
                          
                          {applied ? (
                             <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                               <div className="h-16 w-16 bg-success/20 rounded-full flex items-center justify-center">
                                 <CheckCircle className="h-10 w-10 text-success" />
                               </div>
                               <div>
                                 <h3 className="font-heading text-lg font-bold">Application Success!</h3>
                                 <p className="text-sm text-muted-foreground">Your resume has been parsed and sent to the recruiter.</p>
                               </div>
                               <Button className="w-full" onClick={() => setIsApplyDialogOpen(false)}>Close</Button>
                             </div>
                          ) : (
                            <div className="space-y-6 mt-4">
                              <div className="p-4 bg-muted rounded-lg border border-border space-y-2">
                                <p className="font-medium text-sm">Upload Resume (PDF)</p>
                                <input 
                                  id="resume-upload"
                                  type="file" accept="application/pdf"
                                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                                <label 
                                  htmlFor="resume-upload"
                                  className="flex items-center justify-center w-full p-4 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors"
                                >
                                  {file ? (
                                    <div className="flex items-center gap-2 text-primary overflow-hidden">
                                      <CheckCircle className="h-4 w-4 shrink-0" />
                                      <span className="text-sm font-medium truncate">{file.name}</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                      <UploadCloud className="h-6 w-6" />
                                      <span className="text-xs">Click to select PDF resume</span>
                                    </div>
                                  )}
                                </label>
                                <p className="text-xs text-muted-foreground mt-1 text-center">We'll use our AI engine to parse your skills upon submission.</p>
                              </div>
                              <Button 
                                className="w-full font-bold" 
                                onClick={handleApply} 
                                disabled={!file || applying}
                              >
                                {applying ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Parsing & Submitting...
                                  </>
                                ) : "Submit Application"}
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                  )}
                  
                  {!applied && (
                    <Button variant="outline" className="w-full" onClick={isGuest ? undefined : handleSaveJob} asChild={isGuest}>
                      {isGuest ? (
                         <Link href={`/login?callbackUrl=/jobs/${id}`}>
                           <Heart className="mr-2 h-4 w-4" /> Save for Later
                         </Link>
                      ) : (
                         <>
                           <Heart className={`mr-2 h-4 w-4 transition-colors ${saved ? 'fill-destructive text-destructive' : ''}`} />
                           {saved ? "Saved to Wishlist" : "Save for Later"}
                         </>
                      )}
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
    </LayoutWrapper>
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


