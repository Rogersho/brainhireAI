import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, MapPin, Calendar, Briefcase, Star, TrendingUp, TrendingDown, Minus, Brain, Download } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const candidate = {
  name: "Alex Rivera",
  email: "alex.rivera@email.com",
  location: "San Francisco, CA",
  experience: "7 years",
  appliedFor: "Senior Frontend Developer",
  source: "LinkedIn",
  appliedDate: "Jan 18, 2026",
  overallScore: 92,
  skills: [
    { name: "React", level: 95 },
    { name: "TypeScript", level: 90 },
    { name: "Node.js", level: 82 },
    { name: "CSS/Tailwind", level: 88 },
    { name: "GraphQL", level: 75 },
    { name: "Testing", level: 70 },
  ],
  education: "M.S. Computer Science — Stanford University",
  previousRoles: [
    { title: "Senior Frontend Engineer", company: "TechCorp", duration: "2022 - Present" },
    { title: "Frontend Developer", company: "StartupXYZ", duration: "2019 - 2022" },
    { title: "Junior Developer", company: "WebAgency", duration: "2018 - 2019" },
  ],
  aiInsights: {
    summary: "Alex is a highly qualified candidate with strong frontend expertise and leadership experience. Their skill set aligns closely with the job requirements, particularly in React and TypeScript. They demonstrate growth trajectory and a solid technical foundation.",
    strengths: [
      "Deep expertise in React ecosystem with 5+ years experience",
      "Strong TypeScript skills with demonstrated best practices",
      "Leadership experience mentoring junior developers",
      "Open-source contributions showing community engagement",
    ],
    weaknesses: [
      "Limited backend experience compared to full-stack candidates",
      "No prior experience with the company's specific tech stack (GraphQL)",
      "Could benefit from more system design knowledge",
    ],
    recommendation: "Strongly Recommended",
    fitScore: 92,
    cultureFit: 85,
    technicalFit: 94,
    experienceFit: 88,
  },
};

const CandidateProfile = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/applicants"><ArrowLeft className="mr-2 h-4 w-4" />Back to Applicants</Link>
        </Button>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            {/* Profile Header */}
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                    AR
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="font-heading text-2xl font-bold text-foreground">{candidate.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{candidate.email}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{candidate.location}</span>
                          <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{candidate.experience}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="h-14 w-14 rounded-full border-4 border-primary flex items-center justify-center">
                          <span className="font-heading text-lg font-bold text-primary">{candidate.overallScore}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">AI Score</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge>Shortlisted</Badge>
                      <Badge variant="outline">{candidate.source}</Badge>
                      <Badge variant="secondary">{candidate.appliedFor}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Skills Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.skills.map((skill) => (
                  <div key={skill.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">{skill.name}</span>
                      <span className="text-muted-foreground">{skill.level}%</span>
                    </div>
                    <Progress value={skill.level} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Experience */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{candidate.education}</p>
                <div className="space-y-4">
                  {candidate.previousRoles.map((role, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{role.title}</p>
                        <p className="text-xs text-muted-foreground">{role.company} · {role.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Evaluation Sidebar */}
          <div className="w-full lg:w-96 space-y-4">
            <Card className="border-border border-primary/30">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />AI Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Badge className="mb-3">{candidate.aiInsights.recommendation}</Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">{candidate.aiInsights.summary}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Fit Breakdown</h4>
                  {[
                    { label: "Technical Fit", value: candidate.aiInsights.technicalFit },
                    { label: "Experience Fit", value: candidate.aiInsights.experienceFit },
                    { label: "Culture Fit", value: candidate.aiInsights.cultureFit },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-foreground">{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="h-1.5" />
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-success" />Strengths
                  </h4>
                  <ul className="space-y-1">
                    {candidate.aiInsights.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <Star className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-warning" />Areas of Concern
                  </h4>
                  <ul className="space-y-1">
                    {candidate.aiInsights.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <Minus className="h-3 w-3 text-warning mt-0.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" size="sm">Approve</Button>
                  <Button variant="outline" className="flex-1" size="sm">Reject</Button>
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />Download Resume
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CandidateProfile;
