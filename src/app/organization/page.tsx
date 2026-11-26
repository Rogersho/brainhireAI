"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Building2, MapPin, Briefcase, Plus, Trash2, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OrganizationPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [deptOpen, setDeptOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "", budgetAmount: "" });
  const [locForm, setLocForm] = useState({
    name: "",
    city: "",
    country: "",
    timezone: "UTC",
    address: "",
    isHeadquarters: false,
  });
  const [posForm, setPosForm] = useState({
    title: "",
    departmentId: "",
    grade: "",
    minSalary: "",
    maxSalary: "",
    currency: "USD",
    description: "",
  });

  const loadAll = async () => {
    try {
      const [dRes, lRes, pRes] = await Promise.all([
        apiFetch<{ data: any[] }>("/departments"),
        apiFetch<{ data: any[] }>("/locations"),
        apiFetch<{ data: any[] }>("/positions"),
      ]);
      setDepartments(dRes.data || []);
      setLocations(lRes.data || []);
      setPositions(pRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load organization structure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/departments", {
        method: "POST",
        body: JSON.stringify({
          name: deptForm.name,
          code: deptForm.code,
          description: deptForm.description,
          budgetAmount: deptForm.budgetAmount ? Number(deptForm.budgetAmount) : null,
        }),
      });
      toast.success("Department created");
      setDeptForm({ name: "", code: "", description: "", budgetAmount: "" });
      setDeptOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to create department");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDept = async (id: string) => {
    try {
      await apiFetch(`/departments/${id}`, { method: "DELETE" });
      toast.success("Department removed");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete department");
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/locations", {
        method: "POST",
        body: JSON.stringify(locForm),
      });
      toast.success("Location added");
      setLocForm({ name: "", city: "", country: "", timezone: "UTC", address: "", isHeadquarters: false });
      setLocOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to add location");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      await apiFetch(`/locations/${id}`, { method: "DELETE" });
      toast.success("Location removed");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete location");
    }
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/positions", {
        method: "POST",
        body: JSON.stringify({
          title: posForm.title,
          departmentId: posForm.departmentId && posForm.departmentId !== "none" ? posForm.departmentId : null,
          grade: posForm.grade,
          minSalary: posForm.minSalary ? Number(posForm.minSalary) : null,
          maxSalary: posForm.maxSalary ? Number(posForm.maxSalary) : null,
          currency: posForm.currency || "USD",
          description: posForm.description,
        }),
      });
      toast.success("Job position created");
      setPosForm({
        title: "",
        departmentId: "",
        grade: "",
        minSalary: "",
        maxSalary: "",
        currency: "USD",
        description: "",
      });
      setPosOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to create position");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePosition = async (id: string) => {
    try {
      await apiFetch(`/positions/${id}`, { method: "DELETE" });
      toast.success("Position removed");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete position");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Organization Structure</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage company departments, office locations, and standardized job positions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold mt-1">{departments.length}</p>
              </div>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Office Locations</p>
                <p className="text-2xl font-bold mt-1">{locations.length}</p>
              </div>
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Job Positions</p>
                <p className="text-2xl font-bold mt-1">{positions.length}</p>
              </div>
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="departments">
            <TabsList>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="positions">Job Positions</TabsTrigger>
            </TabsList>

            <TabsContent value="departments" className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Organize teams and track headcount by department.
                </p>
                <Button size="sm" onClick={() => setDeptOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Department
                </Button>
              </div>

              {departments.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No departments created yet. Add your first department (e.g. Engineering, People Ops, Finance).
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((d) => (
                    <Card key={d.id} className="border-border">
                      <CardHeader className="pb-2 flex flex-row items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{d.name}</CardTitle>
                            {d.code && (
                              <Badge variant="outline" className="text-[10px]">
                                {d.code}
                              </Badge>
                            )}
                          </div>
                          {d.description && (
                            <CardDescription className="mt-1 text-xs line-clamp-2">
                              {d.description}
                            </CardDescription>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteDept(d.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {d.employeeCount} {d.employeeCount === 1 ? "worker" : "workers"}
                        </span>
                        {d.budgetAmount !== null && (
                          <span>Budget: ${Number(d.budgetAmount).toLocaleString()}</span>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="locations" className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Define offices, branches, and remote hubs.
                </p>
                <Button size="sm" onClick={() => setLocOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Location
                </Button>
              </div>

              {locations.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No locations added yet. Add your headquarters or remote regions.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((loc) => (
                    <Card key={loc.id} className="border-border">
                      <CardHeader className="pb-2 flex flex-row items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{loc.name}</CardTitle>
                            {loc.isHeadquarters && (
                              <Badge variant="default" className="text-[10px]">
                                HQ
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs mt-1">
                            {[loc.city, loc.country].filter(Boolean).join(", ") || loc.timezone}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteLocation(loc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{loc.timezone}</span>
                        <span>
                          {loc.employeeCount} {loc.employeeCount === 1 ? "worker" : "workers"}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="positions" className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Standardize job titles, grades, and salary bands across your company.
                </p>
                <Button size="sm" onClick={() => setPosOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Position
                </Button>
              </div>

              {positions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No positions defined yet. Add internal roles and compensation grades.
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border">
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="text-left py-3 px-4 font-medium">Position Title</th>
                          <th className="text-left py-3 px-4 font-medium">Department</th>
                          <th className="text-left py-3 px-4 font-medium">Grade</th>
                          <th className="text-left py-3 px-4 font-medium">Salary Band</th>
                          <th className="text-right py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((pos) => (
                          <tr key={pos.id} className="border-b border-border last:border-0">
                            <td className="py-3 px-4 font-medium text-foreground">{pos.title}</td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {pos.departmentName || "—"}
                            </td>
                            <td className="py-3 px-4">
                              {pos.grade ? <Badge variant="secondary">{pos.grade}</Badge> : "—"}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {pos.minSalary || pos.maxSalary
                                ? `${pos.currency} ${pos.minSalary?.toLocaleString() || "0"} – ${pos.maxSalary?.toLocaleString() || "—"}`
                                : "—"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeletePosition(pos.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Create Department Dialog */}
        <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Department</DialogTitle>
              <DialogDescription>Add an internal team or division.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDept} className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Department Name *</Label>
                  <Input
                    required
                    placeholder="Engineering"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Code</Label>
                  <Input
                    placeholder="ENG"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Annual Budget (Optional)</Label>
                <Input
                  type="number"
                  placeholder="250000"
                  value={deptForm.budgetAmount}
                  onChange={(e) => setDeptForm({ ...deptForm, budgetAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Create Department"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Location Dialog */}
        <Dialog open={locOpen} onOpenChange={setLocOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Office Location</DialogTitle>
              <DialogDescription>Register an office branch or remote region.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLocation} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Location Name *</Label>
                <Input
                  required
                  placeholder="Kigali HQ"
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    placeholder="Kigali"
                    value={locForm.city}
                    onChange={(e) => setLocForm({ ...locForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input
                    placeholder="Rwanda"
                    value={locForm.country}
                    onChange={(e) => setLocForm({ ...locForm, country: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input
                  placeholder="Africa/Kigali"
                  value={locForm.timezone}
                  onChange={(e) => setLocForm({ ...locForm, timezone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input
                  placeholder="Street / Building"
                  value={locForm.address}
                  onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="hq-switch">Primary Headquarters</Label>
                <Switch
                  id="hq-switch"
                  checked={locForm.isHeadquarters}
                  onCheckedChange={(v) => setLocForm({ ...locForm, isHeadquarters: v })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Add Location"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Position Dialog */}
        <Dialog open={posOpen} onOpenChange={setPosOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Job Position</DialogTitle>
              <DialogDescription>Define a standardized internal role and salary band.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePosition} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Position Title *</Label>
                <Input
                  required
                  placeholder="Senior Software Engineer"
                  value={posForm.title}
                  onChange={(e) => setPosForm({ ...posForm, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select
                    value={posForm.departmentId || "none"}
                    onValueChange={(v) => setPosForm({ ...posForm, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Level / Grade</Label>
                  <Input
                    placeholder="L4 / Senior"
                    value={posForm.grade}
                    onChange={(e) => setPosForm({ ...posForm, grade: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input
                    value={posForm.currency}
                    onChange={(e) => setPosForm({ ...posForm, currency: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Min Salary</Label>
                  <Input
                    type="number"
                    placeholder="60000"
                    value={posForm.minSalary}
                    onChange={(e) => setPosForm({ ...posForm, minSalary: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Salary</Label>
                  <Input
                    type="number"
                    placeholder="95000"
                    value={posForm.maxSalary}
                    onChange={(e) => setPosForm({ ...posForm, maxSalary: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Create Position"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
