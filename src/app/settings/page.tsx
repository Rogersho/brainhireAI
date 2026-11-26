"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CandidateLayout } from "@/components/CandidateLayout";
import { useAuth, isHrRole, UserRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Loader2, History } from "lucide-react";
import { toast } from "sonner";

const ALL_ROLES: UserRole[] = ["Admin", "HRManager", "HiringManager", "Employee", "Candidate"];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const hrAccess = isHrRole(user?.role);
  const isAdmin = user?.role === "Admin";

  const [accountName, setAccountName] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  const [company, setCompany] = useState<any>({
    companyName: "",
    legalName: "",
    industry: "",
    companySize: "",
    website: "",
    description: "",
    defaultCurrency: "USD",
    timezone: "UTC",
    fiscalYearStartMonth: 1,
  });
  const [savingCompany, setSavingCompany] = useState(false);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    if (user?.name) setAccountName(user.name);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const compRes = await apiFetch<{ data: any }>("/company");
        if (compRes.data) setCompany(compRes.data);
      } catch {
        // Ignore if not loaded
      }

      if (hrAccess) {
        setLoadingAdmin(true);
        try {
          const [uRes, aRes] = await Promise.all([
            apiFetch<{ data: any[] }>("/admin/users"),
            apiFetch<{ data: any[] }>("/admin/audit-logs?limit=60"),
          ]);
          setUsersList(uRes.data || []);
          setAuditLogs(aRes.data || []);
        } catch (err: any) {
          toast.error(err.message || "Failed to load admin settings");
        } finally {
          setLoadingAdmin(false);
        }
      }
    };
    loadSettings();
  }, [user, hrAccess]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: accountName }),
      });
      await refreshUser();
      toast.success("Account profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      const res = await apiFetch<{ data: any }>("/company", {
        method: "PUT",
        body: JSON.stringify({
          companyName: company.companyName,
          legalName: company.legalName,
          industry: company.industry,
          companySize: company.companySize,
          website: company.website,
          description: company.description,
          defaultCurrency: company.defaultCurrency,
          timezone: company.timezone,
          fiscalYearStartMonth: Number(company.fiscalYearStartMonth) || 1,
        }),
      });
      setCompany(res.data);
      toast.success("Company settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to update company settings");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleUpdateUserAccess = async (
    targetId: string,
    payload: { role?: UserRole; isActive?: boolean }
  ) => {
    try {
      const res = await apiFetch<{ data: any }>(`/admin/users/${targetId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, ...res.data } : u))
      );
      toast.success("User access updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update user access");
    }
  };

  const Layout = user?.role === "Candidate" ? CandidateLayout : DashboardLayout;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account, company configuration, access roles, and audit trail.
          </p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Account</TabsTrigger>
            {hrAccess && <TabsTrigger value="company">Company</TabsTrigger>}
            {hrAccess && <TabsTrigger value="roles">Users &amp; Roles</TabsTrigger>}
            {hrAccess && <TabsTrigger value="audit">Audit Logs</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Account Information</CardTitle>
                <CardDescription>Your live Hoobe HR identity and system role.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned System Role</Label>
                    <div>
                      <Badge variant="secondary" className="text-xs">
                        {user?.role || "—"}
                      </Badge>
                    </div>
                  </div>
                  <Button type="submit" disabled={savingAccount}>
                    {savingAccount ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {hrAccess && (
            <TabsContent value="company" className="space-y-6 mt-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Company Profile</CardTitle>
                  <CardDescription>
                    Shared organization defaults used across hiring, employee records, and payroll.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveCompany} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input
                          value={company.companyName || ""}
                          onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Legal Entity Name</Label>
                        <Input
                          value={company.legalName || ""}
                          onChange={(e) => setCompany({ ...company, legalName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Input
                          value={company.industry || ""}
                          onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Company Size</Label>
                        <Input
                          placeholder="50-200 employees"
                          value={company.companySize || ""}
                          onChange={(e) => setCompany({ ...company, companySize: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input
                          placeholder="https://company.com"
                          value={company.website || ""}
                          onChange={(e) => setCompany({ ...company, website: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Default Currency</Label>
                        <Input
                          value={company.defaultCurrency || "USD"}
                          onChange={(e) =>
                            setCompany({ ...company, defaultCurrency: e.target.value.toUpperCase() })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Input
                          value={company.timezone || "UTC"}
                          onChange={(e) => setCompany({ ...company, timezone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fiscal Year Start Month (1–12)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={company.fiscalYearStartMonth || 1}
                          onChange={(e) =>
                            setCompany({ ...company, fiscalYearStartMonth: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>About the Company</Label>
                      <Textarea
                        rows={3}
                        value={company.description || ""}
                        onChange={(e) => setCompany({ ...company, description: e.target.value })}
                      />
                    </div>
                    <Button type="submit" disabled={savingCompany}>
                      {savingCompany ? "Saving..." : "Save Company Settings"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hrAccess && (
            <TabsContent value="roles" className="space-y-4 mt-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Users &amp; Role-Based Access
                  </CardTitle>
                  <CardDescription>
                    {isAdmin
                      ? "Assign system roles and activate or suspend accounts. All changes are logged."
                      : "View all system accounts. Only Admins may change roles or account status."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {loadingAdmin ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="text-left py-3 px-4 font-medium">User</th>
                          <th className="text-left py-3 px-4 font-medium">Employee Code</th>
                          <th className="text-left py-3 px-4 font-medium">Role</th>
                          <th className="text-left py-3 px-4 font-medium">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((u) => (
                          <tr key={u.id} className="border-b border-border last:border-0">
                            <td className="py-3 px-4">
                              <p className="font-medium text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {u.employeeCode || "—"}
                            </td>
                            <td className="py-3 px-4">
                              {isAdmin && u.id !== user?.id ? (
                                <Select
                                  value={u.role}
                                  onValueChange={(val) =>
                                    handleUpdateUserAccess(u.id, { role: val as UserRole })
                                  }
                                >
                                  <SelectTrigger className="h-8 w-36 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALL_ROLES.map((r) => (
                                      <SelectItem key={r} value={r}>
                                        {r}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="secondary">{u.role}</Badge>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Switch
                                checked={Boolean(u.isActive)}
                                disabled={!isAdmin || u.id === user?.id}
                                onCheckedChange={(checked) =>
                                  handleUpdateUserAccess(u.id, { isActive: checked })
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hrAccess && (
            <TabsContent value="audit" className="space-y-4 mt-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <History className="h-4 w-4" /> Security &amp; HR Audit Trail
                  </CardTitle>
                  <CardDescription>
                    Chronological log of administrative, role, employee, and document actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {auditLogs.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground text-center">
                      No audit entries recorded yet.
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-3 px-4 font-medium">Timestamp</th>
                          <th className="text-left py-3 px-4 font-medium">Actor</th>
                          <th className="text-left py-3 px-4 font-medium">Action</th>
                          <th className="text-left py-3 px-4 font-medium">Entity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-b border-border last:border-0">
                            <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="font-medium text-foreground">{log.actorName}</span>{" "}
                              <span className="text-muted-foreground">({log.actorRole})</span>
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {log.action}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">{log.entityType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
