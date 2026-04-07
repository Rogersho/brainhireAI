import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const applicants = [
  { id: 1, name: "Alex Rivera", role: "Senior Frontend Developer", score: 92, status: "Shortlisted", source: "LinkedIn", skills: ["React", "TypeScript", "Node.js"], experience: "7 years" },
  { id: 2, name: "Priya Patel", role: "Data Scientist", score: 88, status: "Shortlisted", source: "Internal Pool", skills: ["Python", "ML", "TensorFlow"], experience: "5 years" },
  { id: 3, name: "Marcus Chen", role: "Product Manager", score: 75, status: "In Review", source: "Indeed", skills: ["Strategy", "Analytics", "Agile"], experience: "8 years" },
  { id: 4, name: "Sofia Andersen", role: "UX Designer", score: 71, status: "In Review", source: "Direct Apply", skills: ["Figma", "Research", "Prototyping"], experience: "4 years" },
  { id: 5, name: "James Okafor", role: "Backend Engineer", score: 64, status: "Pending", source: "LinkedIn", skills: ["Go", "PostgreSQL", "AWS"], experience: "6 years" },
  { id: 6, name: "Emma Wilson", role: "Senior Frontend Developer", score: 90, status: "Shortlisted", source: "Internal Pool", skills: ["React", "Vue", "CSS"], experience: "6 years" },
  { id: 7, name: "Raj Mehta", role: "DevOps Engineer", score: 82, status: "In Review", source: "Indeed", skills: ["Docker", "K8s", "Terraform"], experience: "5 years" },
  { id: 8, name: "Lena Kowalski", role: "Data Scientist", score: 58, status: "Rejected", source: "Direct Apply", skills: ["R", "Statistics", "SQL"], experience: "3 years" },
];

const Applicants = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = applicants.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Applicants</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse and manage all candidates</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search applicants..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Shortlisted">Shortlisted</SelectItem>
              <SelectItem value="In Review">In Review</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Candidate</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4 hidden sm:table-cell">Applied For</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4 hidden md:table-cell">Source</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">AI Score</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                        {a.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.experience} exp</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm text-muted-foreground hidden sm:table-cell">{a.role}</td>
                  <td className="py-3 pr-4 hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">{a.source}</Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${a.score}%` }} />
                      </div>
                      <span className="text-sm font-medium text-foreground w-6">{a.score}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={
                      a.status === "Shortlisted" ? "default" :
                      a.status === "Rejected" ? "destructive" :
                      "secondary"
                    } className="text-xs">
                      {a.status}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/applicants/${a.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Applicants;
