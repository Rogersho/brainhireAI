"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Loader2, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function PublicJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getJobs() {
      try {
        const data = await apiFetch<{ success: boolean; data: any[] }>("/jobs");
        if (data.success && data.data) {
          setJobs(data.data.slice(0, 6)); // show latest 6
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    getJobs();
  }, []);

  if (loading) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container px-4 md:px-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <h2 className="text-3xl font-heading font-bold sm:text-4xl">Latest Open Roles</h2>
          <p className="max-w-[700px] text-muted-foreground">
            Explore the latest positions from top companies using AI hiring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {jobs.map((job) => (
            <Card key={job._id} className="border-border hover:border-primary/30 transition-colors shadow-sm">
              <CardContent className="p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="mb-4">
                  <h3 className="font-heading font-semibold text-lg hover:text-primary transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center"><Users className="mr-1 h-3.5 w-3.5" />{job.department}</span>
                    <span className="flex items-center"><MapPin className="mr-1 h-3.5 w-3.5" />{job.location}</span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t flex items-center justify-between">
                  <Badge variant="secondary" className="font-normal bg-primary/5 text-primary border-primary/10">Full-Time</Badge>
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold" asChild>
                    <Link href={`/jobs/${job._id}`}>
                      Apply <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
