"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth, isHrRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Search,
  Plus,
  Download,
  Users,
  UserCheck,
  Clock,
  Eye,
  Loader2,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

export default function EmployeesPage() {
  const { user } = useAuth();
  const hrAccess = isHrRole(user?.role);

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdTempPass, setCreatedTempPass] = useState<{ email: string; password: string } | null>(
    null
  );

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    workEmail: "",
    phone: "",
    jobTitle: "",
    departmentId: "none",
    locationId: "none",
    positionId: "none",
    managerId: "none",
    employmentType: "Full-Time",
    workMode: "On-Site",
    status: "Active",
    hireDate: new Date().toISOString().slice(0, 10),
    createUserAccount: true,
    accountRole: "Employee",
    applyOnboardingTemplate: true,
  });

  const loadData = async () => {
    try {
      const [empRes, dRes, lRes, pRes] = await Promise.all([
        apiFetch<{ data: any[] }>("/employees"),
        apiFetch<{ data: any[] }>("/departments"),
        apiFetch<{ data: any[] }>("/locations"),
        apiFetch<{ data: any[] }>("/positions"),
      ]);
      setEmployees(empRes.data || []);
      setDepartments(dRes.data || []);
      setLocations(lRes.data || []);
      setPositions(pRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        e.workEmail.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q);
      const matchDept = deptFilter === "all" || e.departmentId === deptFilter;
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, deptFilter, statusFilter]);

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const probationCount = employees.filter((e) => e.status === "Probation").length;
  const onLeaveCount = employees.filter((e) => e.status === "On Leave").length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ data: any; temporaryPassword?: string }>("/employees", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          workEmail: form.workEmail,
          phone: form.phone || null,
          jobTitle: form.jobTitle,
          departmentId: form.departmentId !== "none" ? form.departmentId : null,
          locationId: form.locationId !== "none" ? form.locationId : null,
          positionId: form.positionId !== "none" ? form.positionId : null,
          managerId: form.managerId !== "none" ? form.managerId : null,
          employmentType: form.employmentType,
          workMode: form.workMode,
          status: form.status,
          hireDate: form.hireDate,
          createUserAccount: form.createUserAccount,
          accountRole: form.accountRole,
          applyOnboardingTemplate: form.applyOnboardingTemplate,
        }),
      });
      toast.success(`Added ${res.data.fullName} (${res.data.employeeCode})`);
      if (res.temporaryPassword) {
        setCreatedTempPass({ email: res.data.workEmail, password: res.temporaryPassword });
      } else {
        setAddOpen(false);
      }
      setForm({
        firstName: "",
        lastName: "",
        workEmail: "",
        phone: "",
        jobTitle: "",
        departmentId: "none",
        locationId: "none",
        positionId: "none",
        managerId: "none",
        employmentType: "Full-Time",
        workMode: "On-Site",
        status: "Active",
        hireDate: new Date().toISOString().slice(0, 10),
        createUserAccount: true,
        accountRole: "Employee",
        applyOnboardingTemplate: true,
      });
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    const headers = [
      "Code",
      "Full Name",
      "Email",
      "Job Title",
      "Department",
      "Location",
      "Type",
      "Work Mode",
      "Status",
      "Hire Date",
    ];
    const rows = filtered.map((e) => [
      e.employeeCode,
      e.fullName,
      e.workEmail,
      e.jobTitle,
      e.departmentName || "",
      e.locationName || "",
      e.employmentType,
      e.workMode,
      e.status,
      e.hireDate?.slice(0, 10) || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hoobe-hr-employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Employee Directory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage internal workers, reporting lines, onboarding checklists, and HR documents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
            {hrAccess && (
              <Button
                size="sm"
                onClick={() => {
                  setCreatedTempPass(null);
                  setAddOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add Employee
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Workforce</p>
                <p className="text-2xl font-bold mt-1">{employees.length}</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold mt-1">{activeCount}</p>
              </div>
              <UserCheck className="h-5 w-5 text-success" />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Probation</p>
                <p className="text-2xl font-bold mt-1">{probationCount}</p>
              </div>
              <Clock className="h-5 w-5 text-warning" />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold mt-1">{onLeaveCount}</p>
              </div>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, role, code..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Probation">Probation</SelectItem>
              <SelectItem value="On Leave">On Leave</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
              {hrAccess && <SelectItem value="Terminated">Terminated</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <Card className="border-border">
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-14">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">
                No employees match your filter.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Employee</th>
                    <th className="text-left py-3 px-4 font-medium">Role &amp; Dept</th>
                    <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Manager</th>
                    <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {emp.firstName?.[0]}
                            {emp.lastName?.[0]}
                          </div>
                          <div>
                            <Link
                              href={`/employees/${emp.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {emp.fullName}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {emp.employeeCode} · {emp.workEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{emp.jobTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.departmentName || "Unassigned"}
                          {emp.locationName ? ` · ${emp.locationName}` : ""}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                        {emp.managerName || "—"}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <Badge variant="outline" className="text-[11px]">
                          {emp.employmentType} · {emp.workMode}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            emp.status === "Active"
                              ? "default"
                              : emp.status === "Terminated"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[11px]"
                        >
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/employees/${emp.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Add Employee Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Create an internal employee record, provision login access, and start onboarding.
              </DialogDescription>
            </DialogHeader>

            {createdTempPass ? (
              <div className="space-y-4 mt-2">
                <div className="p-4 rounded-lg border border-success/30 bg-success/10 space-y-2">
                  <p className="text-sm font-semibold text-success">Employee account provisioned</p>
                  <p className="text-xs text-muted-foreground">
                    Share these temporary login credentials securely with the new employee:
                  </p>
                  <div className="bg-background rounded border p-3 font-mono text-xs space-y-1">
                    <p>Email: {createdTempPass.email}</p>
                    <p>Password: {createdTempPass.password}</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setCreatedTempPass(null);
                    setAddOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name *</Label>
                    <Input
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name *</Label>
                    <Input
                      required
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Work Email *</Label>
                    <Input
                      type="email"
                      required
                      value={form.workEmail}
                      onChange={(e) => setForm({ ...form, workEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Job Title *</Label>
                    <Input
                      required
                      placeholder="Product Designer"
                      value={form.jobTitle}
                      onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Standard Position</Label>
                    <Select
                      value={form.positionId}
                      onValueChange={(v) => {
                        const pos = positions.find((p) => p.id === v);
                        setForm({
                          ...form,
                          positionId: v,
                          jobTitle: pos && !form.jobTitle ? pos.title : form.jobTitle,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {positions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title} {p.grade ? `(${p.grade})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Select
                      value={form.departmentId}
                      onValueChange={(v) => setForm({ ...form, departmentId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label>Location</Label>
                    <Select
                      value={form.locationId}
                      onValueChange={(v) => setForm({ ...form, locationId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Direct Manager</Label>
                    <Select
                      value={form.managerId}
                      onValueChange={(v) => setForm({ ...form, managerId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {employees
                          .filter((e) => e.status !== "Terminated")
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.fullName} — {e.jobTitle}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hire Date</Label>
                    <Input
                      type="date"
                      value={form.hireDate}
                      onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Employment Type</Label>
                    <Select
                      value={form.employmentType}
                      onValueChange={(v) => setForm({ ...form, employmentType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-Time">Full-Time</SelectItem>
                        <SelectItem value="Part-Time">Part-Time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Work Mode</Label>
                    <Select
                      value={form.workMode}
                      onValueChange={(v) => setForm({ ...form, workMode: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="On-Site">On-Site</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Probation">Probation</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-border pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Provision System Account</p>
                      <p className="text-xs text-muted-foreground">
                        Auto-generate login credentials for Hoobe HR
                      </p>
                    </div>
                    <Switch
                      checked={form.createUserAccount}
                      onCheckedChange={(v) => setForm({ ...form, createUserAccount: v })}
                    />
                  </div>
                  {form.createUserAccount && (
                    <div className="space-y-1.5">
                      <Label>Account Role</Label>
                      <Select
                        value={form.accountRole}
                        onValueChange={(v) => setForm({ ...form, accountRole: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employee">Employee</SelectItem>
                          <SelectItem value="HiringManager">HiringManager</SelectItem>
                          <SelectItem value="HRManager">HRManager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Start Onboarding Checklist</p>
                      <p className="text-xs text-muted-foreground">
                        Automatically create default onboarding tasks
                      </p>
                    </div>
                    <Switch
                      checked={form.applyOnboardingTemplate}
                      onCheckedChange={(v) => setForm({ ...form, applyOnboardingTemplate: v })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Creating..." : "Create Employee"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
