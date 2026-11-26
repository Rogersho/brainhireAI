"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth, isHrRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Megaphone, Plus, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PoliciesPage() {
  const { user } = useAuth();
  const hrAccess = isHrRole(user?.role);

  const [policies, setPolicies] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [polOpen, setPolOpen] = useState(false);
  const [annOpen, setAnnOpen] = useState(false);

  const [polForm, setPolForm] = useState({
    title: "",
    version: "1.0",
    category: "Handbook",
    contentMarkdown: "",
  });

  const [annForm, setAnnForm] = useState({
    title: "",
    category: "HR Update",
    body: "",
    isPinned: false,
  });

  const loadAll = async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        apiFetch<{ data: any[] }>("/communications/policies"),
        apiFetch<{ data: any[] }>("/communications/announcements"),
      ]);
      setPolicies(pRes.data || []);
      setAnnouncements(aRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load policies & announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handlePublishPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/communications/policies", {
        method: "POST",
        body: JSON.stringify(polForm),
      });
      toast.success("Policy published");
      setPolOpen(false);
      setPolForm({ title: "", version: "1.0", category: "Handbook", contentMarkdown: "" });
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish policy");
    }
  };

  const handleAck = async (id: string) => {
    try {
      await apiFetch(`/communications/policies/${id}/acknowledge`, { method: "POST" });
      toast.success("Policy acknowledged");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to acknowledge policy");
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/communications/announcements", {
        method: "POST",
        body: JSON.stringify(annForm),
      });
      toast.success("Announcement posted");
      setAnnOpen(false);
      setAnnForm({ title: "", category: "HR Update", body: "", isPinned: false });
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to post announcement");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Company Policies &amp; Announcements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Employee handbooks, compliance sign-offs, and company-wide HR updates.
            </p>
          </div>
          {hrAccess && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAnnOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Announcement
              </Button>
              <Button size="sm" onClick={() => setPolOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Publish Policy
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="policies">
            <TabsList>
              <TabsTrigger value="policies">Policies ({policies.length})</TabsTrigger>
              <TabsTrigger value="announcements">Announcements ({announcements.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="policies" className="mt-4 space-y-4">
              {policies.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center space-y-2">
                    <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">No company policies published yet</p>
                  </CardContent>
                </Card>
              ) : (
                policies.map((p) => (
                  <Card key={p.id} className="border-border">
                    <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{p.title}</CardTitle>
                          <Badge variant="outline">v{p.version}</Badge>
                          <Badge variant="secondary">{p.category}</Badge>
                        </div>
                        <CardDescription className="text-xs mt-1">
                          Published {new Date(p.publishedAt).toLocaleDateString()} · Acknowledged by{" "}
                          {p.ackCount}/{p.totalActiveEmployees} employees
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.acknowledgedByMe ? (
                          <Badge variant="default" className="bg-success text-white">
                            <CheckCircle className="h-3 w-3 mr-1" /> Acknowledged
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleAck(p.id)}>
                            I Acknowledge
                          </Button>
                        )}
                        {hrAccess && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              await apiFetch(`/communications/policies/${p.id}`, {
                                method: "DELETE",
                              });
                              await loadAll();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-md p-4 border border-border/60">
                        {p.contentMarkdown}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="announcements" className="mt-4 space-y-4">
              {announcements.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center space-y-2">
                    <Megaphone className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">No announcements posted yet</p>
                  </CardContent>
                </Card>
              ) : (
                announcements.map((a) => (
                  <Card key={a.id} className="border-border">
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{a.title}</CardTitle>
                          <Badge variant="secondary">{a.category}</Badge>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          {a.authorName} · {new Date(a.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {hrAccess && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            await apiFetch(`/communications/announcements/${a.id}`, {
                              method: "DELETE",
                            });
                            await loadAll();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {a.body}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={polOpen} onOpenChange={setPolOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Publish Company Policy</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePublishPolicy} className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Policy Title *</Label>
                  <Input
                    required
                    placeholder="Remote Work & Security Policy"
                    value={polForm.title}
                    onChange={(e) => setPolForm({ ...polForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Version</Label>
                  <Input
                    value={polForm.version}
                    onChange={(e) => setPolForm({ ...polForm, version: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={polForm.category}
                  onValueChange={(v) => setPolForm({ ...polForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Handbook">Handbook</SelectItem>
                    <SelectItem value="Code of Conduct">Code of Conduct</SelectItem>
                    <SelectItem value="Remote Work">Remote Work</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Leave Policy">Leave Policy</SelectItem>
                    <SelectItem value="Benefits">Benefits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Policy Content *</Label>
                <Textarea
                  rows={8}
                  required
                  value={polForm.contentMarkdown}
                  onChange={(e) => setPolForm({ ...polForm, contentMarkdown: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Publish Policy
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={annOpen} onOpenChange={setAnnOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post Announcement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePostAnnouncement} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  required
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={annForm.category}
                  onValueChange={(v) => setAnnForm({ ...annForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="HR Update">HR Update</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Message *</Label>
                <Textarea
                  rows={5}
                  required
                  value={annForm.body}
                  onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Post Announcement
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
