"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { CandidateLayout } from "@/components/CandidateLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, FileText, UploadCloud, CheckCircle, AlertTriangle, Loader2, Zap, Briefcase, MapPin, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import Link from "next/link";

export default function ProfilePage() {
   const { user } = useAuth();
   const [profile, setProfile] = useState<any>(null);
   const [recommendations, setRecommendations] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [recommendationsLoading, setRecommendationsLoading] = useState(false);
   const [file, setFile] = useState<File | null>(null);
   const [uploading, setUploading] = useState(false);
   const [uploadError, setUploadError] = useState<string | null>(null);
   const [dialogOpen, setDialogOpen] = useState(false);

   const fetchProfile = async () => {
      try {
         const { data } = await apiFetch<{ data: any }>('/user/profile');
         setProfile(data);
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   };

   const fetchRecommendations = async () => {
      if (!profile?.resumeText) return;
      setRecommendationsLoading(true);
      try {
         const { recommendations } = await apiFetch<{ recommendations: any[] }>('/ai/recommendations');
         setRecommendations(recommendations || []);
      } catch (e) {
         console.error('Error fetching recommendations:', e);
         setRecommendations([]);
      } finally {
         setRecommendationsLoading(false);
      }
   };

   useEffect(() => {
      if (user) fetchProfile();
   }, [user]);

   // Disabled auto-fetch recommendations to save Gemini API quota
   // useEffect(() => {
   //    if (profile?.resumeText) {
   //       fetchRecommendations();
   //    }
   // }, [profile?.resumeText]);

   const handleUpload = async () => {
      if (!file) return;
      setUploading(true);
      setUploadError(null);
      try {
         const formData = new FormData();
         formData.append('file', file);
         await apiFetch('/user/profile', { method: 'POST', body: formData });
         await fetchProfile();
         setDialogOpen(false); // Close dialog on success
         setFile(null);
      } catch (e: any) {
         console.error(e);
         setUploadError(e.message || 'Failed to upload CV. Please try again.');
      } finally {
         setUploading(false);
      }
   };

   return (
      <CandidateLayout>
         <div className="space-y-8 max-w-5xl mx-auto">
            <div>
               <h1 className="text-3xl font-bold font-heading text-foreground">Global Profile</h1>
               <p className="text-muted-foreground mt-2">Manage your master CV to get hyper-personalized AI job matches and recruiter insights.</p>
            </div>

            {loading ? (
               <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
               <div className="space-y-6">
                  <Card className="border-border shadow-sm">
                     <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                           <CardTitle className="font-heading">Master CV Database</CardTitle>
                           <CardDescription className="mt-1">Your global CV will be deeply parsed by the Gemini AI Engine.</CardDescription>
                        </div>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                           <DialogTrigger asChild>
                              <Button variant={profile?.resumeText ? "outline" : "default"} className="shadow-sm">
                                 <UploadCloud className="mr-2 h-4 w-4" />
                                 {profile?.resumeText ? "Update CV File" : "Upload Initial CV"}
                              </Button>
                           </DialogTrigger>
                           <DialogContent>
                              <DialogHeader>
                                 <DialogTitle>Upload Master Resume</DialogTitle>
                                 <DialogDescription>Gemini will intelligently parse your PDF, DOC, DOCX, or CSV to rewrite your AI profile mapping.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                 {uploadError && (
                                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                                       <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                       <p className="text-sm text-destructive">{uploadError}</p>
                                    </div>
                                 )}
                                 <div className="p-4 bg-muted rounded-lg border border-border">
                                    <input type="file" accept=".pdf,.doc,.docx,.csv" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" />
                                 </div>
                                 <Button className="w-full font-bold shadow-md" onClick={handleUpload} disabled={!file || uploading}>
                                    {uploading ? (
                                       <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Document with Gemini...</>
                                    ) : "Submit to BrainHire Engine"}
                                 </Button>
                              </div>
                           </DialogContent>
                        </Dialog>
                     </CardHeader>
                     <CardContent>
                        {!profile?.resumeText ? (
                           <div className="p-10 text-center bg-muted/20 border border-dashed rounded-xl shadow-inner">
                              <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                              <h3 className="font-semibold text-lg">No Master CV Found.</h3>
                              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Upload your resume to unlock AI matchmaking instantly. Recruiters cannot see your profile until it exists.</p>
                           </div>
                        ) : (
                           <div className="p-5 bg-success/10 border border-success/20 rounded-xl flex items-center gap-4 shadow-sm">
                              <div className="bg-success/20 p-2 rounded-full">
                                 <CheckCircle className="h-8 w-8 text-success" />
                              </div>
                              <div>
                                 <p className="font-bold text-success text-lg">CV Parsed & Actively Scanning</p>
                                 <p className="text-sm text-success/80 mt-1">BrainHire AI is continually scanning the live job market using this profile document.</p>
                              </div>
                           </div>
                        )}
                     </CardContent>
                  </Card>

                  {profile?.aiAnalysis && (
                     <Card className="border-border shadow-sm relative overflow-hidden mt-8">
                        <div className="absolute top-0 right-0 pt-0 pointer-events-none opacity-[0.03]">
                           <Brain className="h-64 w-64 text-primary transform translate-x-12 -translate-y-12" />
                        </div>
                        <CardHeader>
                           <CardTitle className="font-heading flex items-center gap-2 text-2xl">
                              <Brain className="h-6 w-6 text-primary" /> Algorithmic Career Analysis
                           </CardTitle>
                           <CardDescription className="text-base">Generated automatically from your resume via Gemini</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8 relative z-10">
                           <div>
                              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                 <Zap className="h-4 w-4 text-amber-500" /> Extracted Skill Vectors
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                 {profile.skills?.map((s: string) => (
                                    <Badge key={s} variant="secondary" className="px-3 py-1 font-medium bg-primary/10 hover:bg-primary/20 text-primary border-primary/20">{s}</Badge>
                                 ))}
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-6 rounded-xl border border-border bg-card shadow-sm hover:border-success/30 transition-colors">
                                 <h4 className="font-bold flex items-center gap-2 mb-5 text-success text-lg">
                                    <CheckCircle className="h-5 w-5" /> Verified Strengths
                                 </h4>
                                 <ul className="space-y-3">
                                    {profile.aiAnalysis.strengths?.map((s: string) => (
                                       <li key={s} className="text-sm text-muted-foreground flex items-start gap-3 leading-relaxed">
                                          <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(0,200,0,0.5)]"></span> {s}
                                       </li>
                                    ))}
                                 </ul>
                              </div>
                              <div className="p-6 rounded-xl border border-border bg-card shadow-sm bg-destructive/5 hover:border-destructive/30 transition-colors">
                                 <h4 className="font-bold flex items-center gap-2 mb-5 text-destructive text-lg">
                                    <AlertTriangle className="h-5 w-5" /> Vulnerabilities / Growth Areas
                                 </h4>
                                 <ul className="space-y-3">
                                    {profile.aiAnalysis.weaknesses?.map((w: string) => (
                                       <li key={w} className="text-sm text-destructive/80 flex items-start gap-3 leading-relaxed">
                                          <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-destructive/80 shadow-[0_0_8px_rgba(200,0,0,0.5)]"></span> {w}
                                       </li>
                                    ))}
                                 </ul>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  )}

                  {/* {profile?.resumeText && (
                     <Card className="border-border shadow-sm relative overflow-hidden mt-8">
                        <div className="absolute top-0 right-0 pt-0 pointer-events-none opacity-[0.03]">
                           <Briefcase className="h-64 w-64 text-primary transform translate-x-12 -translate-y-12" />
                        </div>
                        <CardHeader>
                           <CardTitle className="font-heading flex items-center gap-2 text-2xl">
                              <Briefcase className="h-6 w-6 text-primary" /> AI-Powered Job Recommendations
                           </CardTitle>
                           <CardDescription className="text-base">Personalized job matches based on your CV and skills</CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                           {recommendationsLoading ? (
                              <div className="flex items-center justify-center py-12">
                                 <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                                 <span>Analyzing job market matches...</span>
                              </div>
                           ) : recommendations.length === 0 ? (
                              <div className="p-10 text-center bg-muted/20 border border-dashed rounded-xl">
                                 <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                                 <h3 className="font-semibold text-lg">No matching jobs found</h3>
                                 <p className="text-sm text-muted-foreground mt-2">Check back soon for new job postings that match your profile!</p>
                              </div>
                           ) : (
                              <div className="space-y-4">
                                 {recommendations.map((rec: any) => (
                                    <Link key={rec.jobId} href={`/jobs/${rec.jobId}`}>
                                       <div className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                                          <div className="flex items-start justify-between mb-3">
                                             <div>
                                                <h3 className="font-bold text-lg text-foreground">{rec.job?.title}</h3>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                   <span className="flex items-center gap-1">
                                                      <Briefcase className="h-4 w-4" /> {rec.job?.department}
                                                   </span>
                                                   <span className="flex items-center gap-1">
                                                      <MapPin className="h-4 w-4" /> {rec.job?.location}
                                                   </span>
                                                </div>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                <span className="text-2xl font-bold text-primary">{rec.matchPercentage}%</span>
                                                <span className="text-xs text-primary/70">match</span>
                                             </div>
                                          </div>

                                          <p className="text-sm text-muted-foreground mb-4">{rec.reasoning}</p>

                                          {rec.alignedSkills && rec.alignedSkills.length > 0 && (
                                             <div className="mb-3">
                                                <span className="text-xs uppercase tracking-wider font-semibold text-success flex items-center gap-1 mb-2">
                                                   <CheckCircle className="h-3 w-3" /> Aligned Skills
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                   {rec.alignedSkills.slice(0, 5).map((skill: string) => (
                                                      <Badge key={skill} variant="secondary" className="bg-success/10 text-success border-success/20">{skill}</Badge>
                                                   ))}
                                                </div>
                                             </div>
                                          )}

                                          {rec.missingSkills && rec.missingSkills.length > 0 && (
                                             <div>
                                                <span className="text-xs uppercase tracking-wider font-semibold text-amber-600 flex items-center gap-1 mb-2">
                                                   <AlertTriangle className="h-3 w-3" /> Growth Opportunity
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                   {rec.missingSkills.slice(0, 3).map((skill: string) => (
                                                      <Badge key={skill} variant="outline" className="bg-amber-50/50 text-amber-700 border-amber-200">{skill}</Badge>
                                                   ))}
                                                </div>
                                             </div>
                                          )}
                                       </div>
                                    </Link>
                                 ))}
                              </div>
                           )}
                        </CardContent>
                     </Card>
                  )} */}
               </div>
            )}
         </div>
      </CandidateLayout>
   );
}
