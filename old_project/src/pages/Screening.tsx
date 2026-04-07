import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Play, CheckCircle, Star, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const screeningResults = [
  {
    rank: 1, name: "Alex Rivera", score: 92, fit: "Excellent",
    strengths: ["Expert React/TS", "Leadership exp", "OSS contributions"],
    weaknesses: ["Limited backend"],
    recommendation: "Strongly Recommended",
  },
  {
    rank: 2, name: "Emma Wilson", score: 90, fit: "Excellent",
    strengths: ["Multi-framework exp", "Design system work", "Team player"],
    weaknesses: ["Shorter tenure at companies"],
    recommendation: "Strongly Recommended",
  },
  {
    rank: 3, name: "Priya Patel", score: 88, fit: "Strong",
    strengths: ["ML expertise", "Research background", "Data-driven"],
    weaknesses: ["Less frontend focus"],
    recommendation: "Recommended",
  },
  {
    rank: 4, name: "Raj Mehta", score: 82, fit: "Good",
    strengths: ["Infrastructure skills", "Automation mindset", "Cloud expertise"],
    weaknesses: ["Different role focus", "Less relevant experience"],
    recommendation: "Recommended with reservations",
  },
  {
    rank: 5, name: "Marcus Chen", score: 75, fit: "Moderate",
    strengths: ["Strategic thinking", "Cross-functional exp"],
    weaknesses: ["Non-technical role", "Different domain"],
    recommendation: "Consider for PM roles",
  },
];

const Screening = () => {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(true);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">AI Screening</h1>
            <p className="text-muted-foreground text-sm mt-1">Evaluate and rank applicants with AI</p>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue="1">
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Senior Frontend Developer</SelectItem>
                <SelectItem value="2">Data Scientist</SelectItem>
                <SelectItem value="3">Product Manager</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setRunning(true); setTimeout(() => { setRunning(false); setCompleted(true); }, 2000); }}>
              {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {running ? "Screening..." : "Run Screening"}
            </Button>
          </div>
        </div>

        {completed && (
          <>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Screening Complete</p>
                    <p className="text-xs text-muted-foreground">87 applicants screened for Senior Frontend Developer · 5 recommended</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {screeningResults.map((r) => (
                <Card key={r.rank} className={`border-border ${r.rank <= 2 ? "border-primary/30" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex items-center gap-4 md:w-60 shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-heading font-bold text-sm shrink-0 ${
                          r.rank <= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          #{r.rank}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{r.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${r.score}%` }} />
                            </div>
                            <span className="text-sm font-bold text-foreground">{r.score}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-success" />Strengths
                          </p>
                          <ul className="space-y-0.5">
                            {r.strengths.map((s, i) => (
                              <li key={i} className="text-xs text-foreground flex items-center gap-1">
                                <Star className="h-2.5 w-2.5 text-primary" />{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3 text-warning" />Concerns
                          </p>
                          <ul className="space-y-0.5">
                            {r.weaknesses.map((w, i) => (
                              <li key={i} className="text-xs text-foreground flex items-center gap-1">
                                <Minus className="h-2.5 w-2.5 text-warning" />{w}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Fit</p>
                            <Badge variant={r.fit === "Excellent" ? "default" : "secondary"} className="text-xs">{r.fit}</Badge>
                          </div>
                          <p className="text-xs text-primary font-medium mt-2">{r.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Screening;
