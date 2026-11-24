"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { CandidateLayout } from "@/components/CandidateLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Clock, XCircle, FileText, ExternalLink, Building, MapPin } from "lucide-react";
import Link from "next/link";

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchApps = async () => {
         try {
           const { data } = await apiFetch<{ data: any[] }>(`/applicants`);
           setApplications(data || []);
         } catch (err) {
           console.error(err);
         } finally {
           setLoading(false);
         }
      };
      fetchApps();
    }
  }, [user]);

  return (
    <CandidateLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Application Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor the status of all your submitted applications in real-time.</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading">My Applications</CardTitle>
            <CardDescription>You have submitted {applications.length} applications through BrainHire.</CardDescription>
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
                  You haven't uploaded your CV or applied to any roles. Browse our job board and let AI parse your profile for the perfect match!
                </p>
                <Button size="lg" className="shadow-md" asChild><Link href="/jobs">Browse Jobs</Link></Button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app._id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-lg border border-border bg-card hover:border-primary/30 transition-all shadow-sm group">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <Building className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <h4 className="font-heading font-semibold text-foreground text-lg">{app.jobId?.title || "Unknown Role"}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center"><Building className="mr-1 h-3 w-3" /> {app.jobId?.department || "Department N/A"}</span>
                          <span className="flex items-center"><MapPin className="mr-1 h-3 w-3" /> {app.jobId?.location || "Location N/A"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 md:mt-0 flex flex-col md:items-end gap-3 w-full md:w-auto">
                      <div className="flex items-center justify-between md:justify-end w-full gap-4">
                         <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                           Applied: {new Date(app.createdAt).toLocaleDateString()}
                         </span>
                         <Badge variant={
                           app.status === "Shortlisted" ? "default" :
                           app.status === "Rejected" ? "destructive" : "secondary"
                         } className="px-3 py-1">
                           {app.status === "Shortlisted" && <CheckCircle className="mr-1 h-3 w-3" />}
                           {app.status === "Rejected" && <XCircle className="mr-1 h-3 w-3" />}
                           {app.status === "Pending" && <Clock className="mr-1 h-3 w-3" />}
                           {app.status === "In Review" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                           {app.status}
                         </Badge>
                      </div>
                      <Button variant="outline" size="sm" className="w-full md:w-auto" asChild>
                         <Link href={`/jobs/${app.jobId?._id}`}>
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
