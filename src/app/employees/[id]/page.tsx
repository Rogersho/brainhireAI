"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth, isHrRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  UploadCloud,
  FileText,
  ExternalLink,
  Trash2,
  Plus,
  UserX,
  Loader2,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const hrAccess = isHrRole(user?.role);

  const [emp, setEmp] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("Paperwork");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("Contract");
  const [docExpiry, setDocExpiry] = useState("");
  const [docVisible, setDocVisible] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [offboardOpen, setOffboardOpen] = useState(false);
  const [offboardReason, setOffboardReason] = useState("");
  const [offboardDate, setOffboardDate] = useState(new Date().toISOString().slice(0, 10));
  const [offboardDeactivate, setOffboardDeactivate] = useState(true);
  const [offboarding, setOffboarding] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const empRes = await apiFetch<{ data: any }>(`/employees/${id}`);
      setEmp(empRes.data);

      const [tRes, dRes] = await Promise.all([
        apiFetch<{ data: any[] }>(`/checklists/employee/${id}`).catch(() => ({ data: [] })),
        apiFetch<{ data: any[] }>(`/documents/employee/${id}`).catch(() => ({ data: [] })),
      ]);
      setTasks(tRes.data || []);
      setDocs(dRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load employee profile");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const progressPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const handleToggleTask = async (task: any) => {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    try {
      await apiFetch(`/checklists/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Could not update task");
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await apiFetch(`/checklists/employee/${id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          type: emp?.status === "Terminated" ? "Offboarding" : "Onboarding",
          title: newTaskTitle,
          category: newTaskCategory,
        }),
      });
      setNewTaskTitle("");
      toast.success("Task added");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to add task");
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("title", docTitle || docFile.name);
      formData.append("category", docCategory);
      if (docExpiry) formData.append("expiryDate", docExpiry);
      formData.append("isVisibleToEmployee", String(docVisible));

      await apiFetch(`/documents/employee/${id}`, {
        method: "POST",
        body: formData,
      });
      toast.success("Document uploaded to secure vault");
      setDocFile(null);
      setDocTitle("");
      setDocExpiry("");
      setUploadOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadDoc = async (docId: string) => {
    try {
      const res = await apiFetch<{ data: { url: string } }>(`/documents/${docId}/download`);
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      toast.error(err.message || "Unable to open document");
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await apiFetch(`/documents/${docId}`, { method: "DELETE" });
      toast.success("Document deleted");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  };

  const handleOffboard = async () => {
    setOffboarding(true);
    try {
      await apiFetch(`/employees/${id}/offboard`, {
        method: "POST",
        body: JSON.stringify({
          terminationDate: offboardDate,
          terminationReason: offboardReason,
          deactivateAccount: offboardDeactivate,
        }),
      });
      toast.success("Offboarding workflow initiated");
      setOffboardOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Offboarding failed");
    } finally {
      setOffboarding(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!emp) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-muted-foreground">Employee not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/employees">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Directory
            </Link>
          </Button>
          {hrAccess && emp.status !== "Terminated" && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setOffboardOpen(true)}
            >
              <UserX className="h-4 w-4 mr-1.5" /> Offboard Employee
            </Button>
          )}
        </div>

        {/* Profile Header */}
        <Card className="border-border">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                {emp.firstName?.[0]}
                {emp.lastName?.[0]}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-heading text-2xl font-bold text-foreground">
                    {emp.fullName}
                  </h1>
                  <Badge variant={emp.status === "Active" ? "default" : emp.status === "Terminated" ? "destructive" : "secondary"}>
                    {emp.status}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {emp.employeeCode}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {emp.jobTitle}
                  {emp.departmentName ? ` · ${emp.departmentName}` : ""}
                  {emp.locationName ? ` · ${emp.locationName}` : ""}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {emp.workEmail}
              </p>
              {emp.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {emp.phone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checklists">
              Checklists ({completedTasks}/{tasks.length})
            </TabsTrigger>
            <TabsTrigger value="documents">Document Vault ({docs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Department
                    </span>
                    <span className="font-medium">{emp.departmentName || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Location
                    </span>
                    <span className="font-medium">{emp.locationName || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reports To</span>
                    <span className="font-medium">{emp.managerName || "Top Level"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employment Type</span>
                    <span className="font-medium">{emp.employmentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Work Mode</span>
                    <span className="font-medium">{emp.workMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Hire Date
                    </span>
                    <span className="font-medium">
                      {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  {emp.terminationDate && (
                    <div className="flex justify-between text-destructive">
                      <span>Termination Date</span>
                      <span className="font-medium">
                        {new Date(emp.terminationDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Personal &amp; Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Personal Email</span>
                    <span className="font-medium">{emp.personalEmail || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nationality</span>
                    <span className="font-medium">{emp.nationality || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-medium text-right max-w-[220px]">{emp.address || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emergency Contact</span>
                    <span className="font-medium">{emp.emergencyContactName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emergency Phone</span>
                    <span className="font-medium">{emp.emergencyContactPhone || "—"}</span>
                  </div>
                  {emp.userRole && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">System Role</span>
                      <Badge variant="secondary">{emp.userRole}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="checklists" className="mt-6 space-y-4">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Onboarding &amp; Offboarding Tasks</CardTitle>
                    <CardDescription>
                      {completedTasks} of {tasks.length} tasks completed ({progressPct}%)
                    </CardDescription>
                  </div>
                </div>
                <Progress value={progressPct} className="h-2 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                {hrAccess && (
                  <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Add custom checklist task..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paperwork">Paperwork</SelectItem>
                        <SelectItem value="IT & Access">IT &amp; Access</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Training">Training</SelectItem>
                        <SelectItem value="Exit">Exit</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </form>
                )}

                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No checklist tasks assigned yet.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {tasks.map((task) => {
                      const done = task.status === "Completed";
                      return (
                        <div
                          key={task.id}
                          className="py-3 flex items-start justify-between gap-4"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task)}
                            className="flex items-start gap-3 text-left flex-1"
                          >
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p
                                className={`text-sm font-medium ${
                                  done ? "line-through text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[10px]">
                              {task.type} · {task.category}
                            </Badge>
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                Due {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6 space-y-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Confidential Document Vault</CardTitle>
                  <CardDescription>
                    Encrypted in Neon S3 with short-lived authorized download links.
                  </CardDescription>
                </div>
                {hrAccess && (
                  <Button size="sm" onClick={() => setUploadOpen(true)}>
                    <UploadCloud className="h-4 w-4 mr-1.5" /> Upload Document
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {docs.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    No documents stored for this employee yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {docs.map((doc) => (
                      <div key={doc.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{doc.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Badge variant="secondary" className="text-[10px]">
                                {doc.category}
                              </Badge>
                              <span>{doc.fileName}</span>
                              {doc.expiryDate && (
                                <span className="text-warning">
                                  Expires {new Date(doc.expiryDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDoc(doc.id)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                          </Button>
                          {hrAccess && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteDoc(doc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Upload Document Dialog */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload HR Document</DialogTitle>
              <DialogDescription>
                Store contracts, IDs, NDAs, or certificates in the secure Neon S3 vault.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadDoc} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Document Title</Label>
                <Input
                  placeholder="Signed Employment Contract 2026"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={docCategory} onValueChange={setDocCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="ID / Passport">ID / Passport</SelectItem>
                      <SelectItem value="NDA">NDA</SelectItem>
                      <SelectItem value="Tax Form">Tax Form</SelectItem>
                      <SelectItem value="Certificate">Certificate</SelectItem>
                      <SelectItem value="Offer Letter">Offer Letter</SelectItem>
                      <SelectItem value="Resume">Resume</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry Date (Optional)</Label>
                  <Input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>File *</Label>
                <Input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="doc-visible">Visible to Employee</Label>
                <Switch
                  id="doc-visible"
                  checked={docVisible}
                  onCheckedChange={setDocVisible}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!docFile || uploadingDoc}>
                {uploadingDoc ? "Uploading..." : "Upload to Vault"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Offboard Dialog */}
        <Dialog open={offboardOpen} onOpenChange={setOffboardOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Offboard {emp.fullName}</DialogTitle>
              <DialogDescription>
                Marks employee as Terminated and spawns the Standard Offboarding checklist.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Last Working / Termination Date</Label>
                <Input
                  type="date"
                  value={offboardDate}
                  onChange={(e) => setOffboardDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reason / Notes</Label>
                <Input
                  placeholder="Resignation / Contract end / Restructuring"
                  value={offboardReason}
                  onChange={(e) => setOffboardReason(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="deactivate-login">Deactivate Hoobe HR login access immediately</Label>
                <Switch
                  id="deactivate-login"
                  checked={offboardDeactivate}
                  onCheckedChange={setOffboardDeactivate}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOffboardOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleOffboard} disabled={offboarding}>
                  {offboarding ? "Processing..." : "Confirm Offboarding"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
