"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CandidateLayout } from "@/components/CandidateLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, FileText, UploadCloud, CheckCircle, AlertTriangle, Loader2, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const { data } = await res.json();
      setProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchProfile();
  }, [session]);

  const handleUpload = async () => {
     if (!file) return;
     setUploading(true);
     try {
       const formData = new FormData();
       formData.append('file', file);
       await fetch('/api/user/profile', { method: 'POST', body: formData });
       await fetchProfile();
     } catch (e) {
       console.error(e);
     } finally {
       setUploading(false);
       setFile(null);
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
                     <Dialog>
                        <DialogTrigger asChild>
                           <Button variant={profile?.resumeText ? "outline" : "default"} className="shadow-sm">
                             <UploadCloud className="mr-2 h-4 w-4" /> 
                             {profile?.resumeText ? "Update CV File" : "Upload Initial CV"}
                           </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload Master Resume</DialogTitle>
                            <DialogDescription>Gemini will intelligently parse your PDF to rewrite your AI profile mapping.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="p-4 bg-muted rounded-lg border border-border">
                              <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" />
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
            </div>
          )}
       </div>
    </CandidateLayout>
  );
}
