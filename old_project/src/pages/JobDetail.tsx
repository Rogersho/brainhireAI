import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, MapPin, Calendar, Brain, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const jobDetails: Record<string, any> = {
  "1": {
    title: "Senior Frontend Developer", department: "Engineering", location: "Remote",
    posted: "Jan 15, 2026", description: "We're looking for an experienced frontend developer to lead our web application development. You'll work with React, TypeScript, and modern tooling to build performant, accessible user interfaces.",
    requirements: ["5+ years frontend development", "Expert in React & TypeScript", "Experience with design systems", "Strong problem-solving skills", "Excellent communication"],
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "GraphQL"],
    applicants: [
      { name: "Alex Rivera", score: 92, status: "Shortlisted" },
      { name: "Kim Tanaka", score: 85, status: "Shortlisted" },
      { name: "Jordan Smith", score: 78, status: "In Review" },
      { name: "Pat Nguyen", score: 72, status: "In Review" },
      { name: "Casey Brown", score: 64, status: "Pending" },
    ],
  },
};

const JobDetail = () => {
  const { id } = useParams();
  const job = jobDetails[id || "1"] || jobDetails["1"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/jobs"><ArrowLeft className="mr-2 h-4 w-4" />Back to Jobs</Link>
        </Button>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="font-heading text-2xl font-bold text-foreground">{job.title}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" />{job.department}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{job.posted}</span>
                    </div>
                  </div>
                  <Badge>Active</Badge>
                </div>

                <div className="mt-6">
                  <h3 className="font-heading font-semibold text-foreground mb-2">Description</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{job.description}</p>
                </div>

                <div className="mt-6">
                  <h3 className="font-heading font-semibold text-foreground mb-2">Requirements</h3>
                  <ul className="space-y-1">
                    {job.requirements.map((r: string) => (
                      <li key={r} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  <h3 className="font-heading font-semibold text-foreground mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s: string) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-full lg:w-80 space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />Top Applicants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.applicants.map((a: any) => (
                  <Link key={a.name} to="/applicants/1" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${a.score}%` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground w-6 text-right">{a.score}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Button className="w-full" asChild>
              <Link to="/screening"><Brain className="mr-2 h-4 w-4" />Run AI Screening</Link>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default JobDetail;
