"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth, isHrRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Wallet, Plus, CheckCircle, DollarSign, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PayrollPage() {
  const { user } = useAuth();
  const hrAccess = isHrRole(user?.role);

  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [compProfiles, setCompProfiles] = useState<any[]>([]);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [runOpen, setRunOpen] = useState(false);
  const [runYear, setRunYear] = useState(String(new Date().getFullYear()));
  const [runMonth, setRunMonth] = useState(String(new Date().getMonth() + 1));

  const [compModalEmp, setCompModalEmp] = useState<any>(null);
  const [compForm, setCompForm] = useState({
    baseSalary: "",
    currency: "USD",
    allowanceAmount: "0",
    taxPercent: "10",
    bankName: "",
    bankLast4: "",
  });

  const loadAll = useCallback(async () => {
    try {
      const myRes = await apiFetch<{ data: any[] }>("/payroll/payslips/me");
      setMyPayslips(myRes.data || []);

      if (hrAccess) {
        const [rRes, cRes] = await Promise.all([
          apiFetch<{ data: any[] }>("/payroll/runs"),
          apiFetch<{ data: any[] }>("/payroll/compensation"),
        ]);
        setRuns(rRes.data || []);
        setCompProfiles(cRes.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  }, [hrAccess]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  const openRunDetail = async (id: string) => {
    try {
      const res = await apiFetch<{ data: any }>(`/payroll/runs/${id}`);
      setSelectedRun(res.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load payroll run");
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ data: { id: string } }>("/payroll/runs", {
        method: "POST",
        body: JSON.stringify({ periodYear: Number(runYear), periodMonth: Number(runMonth) }),
      });
      toast.success("Monthly payroll draft generated");
      setRunOpen(false);
      await loadAll();
      await openRunDetail(res.data.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create payroll run");
    }
  };

  const handleFinalizeRun = async (id: string, action: "approve" | "mark-paid") => {
    try {
      await apiFetch(`/payroll/runs/${id}/finalize`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      toast.success(action === "approve" ? "Payroll approved & payslips issued" : "Payroll marked Paid");
      await loadAll();
      await openRunDetail(id);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  const handleSaveComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compModalEmp) return;
    try {
      const allowances = Number(compForm.allowanceAmount) > 0
        ? [{ name: "Standard Allowance", amount: Number(compForm.allowanceAmount) }]
        : [];
      const deductions = Number(compForm.taxPercent) > 0
        ? [{ name: "Income Tax", percent: Number(compForm.taxPercent) }]
        : [];
      await apiFetch(`/payroll/compensation/${compModalEmp.employeeId}`, {
        method: "POST",
        body: JSON.stringify({
          baseSalary: Number(compForm.baseSalary),
          currency: compForm.currency || "USD",
          allowances,
          deductions,
          bankName: compForm.bankName,
          bankAccountLast4: compForm.bankLast4,
        }),
      });
      toast.success(`Compensation saved for ${compModalEmp.fullName}`);
      setCompModalEmp(null);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to update compensation");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Payroll &amp; Compensation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage employee salaries, run automated monthly payroll, and view official payslips.
            </p>
          </div>
          {hrAccess && (
            <Button size="sm" onClick={() => setRunOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> New Payroll Run
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue={hrAccess ? "runs" : "my-payslips"}>
            <TabsList>
              {hrAccess && <TabsTrigger value="runs">Payroll Runs ({runs.length})</TabsTrigger>}
              {hrAccess && (
                <TabsTrigger value="compensation">
                  Compensation ({compProfiles.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="my-payslips">My Payslips ({myPayslips.length})</TabsTrigger>
            </TabsList>

            {hrAccess && (
              <TabsContent value="runs" className="mt-4 space-y-6">
                {runs.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-14 text-center space-y-2">
                      <Wallet className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">No payroll runs yet</p>
                      <p className="text-xs text-muted-foreground">
                        Set employee base salaries in Compensation, then click New Payroll Run.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {runs.map((run) => (
                      <Card
                        key={run.id}
                        className={`border-border cursor-pointer transition-colors hover:border-foreground/30 ${
                          selectedRun?.id === run.id ? "ring-1 ring-foreground" : ""
                        }`}
                        onClick={() => openRunDetail(run.id)}
                      >
                        <CardHeader className="pb-2 flex flex-row items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{run.label}</CardTitle>
                            <CardDescription className="text-xs">
                              {run.employeeCount} employees
                            </CardDescription>
                          </div>
                          <Badge variant={run.status === "Paid" ? "default" : "secondary"}>
                            {run.status}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Gross</span>
                            <span className="font-medium">${run.totalGross.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Net</span>
                            <span className="font-semibold text-foreground">
                              ${run.totalNet.toLocaleString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {selectedRun && (
                  <Card className="border-border">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          {selectedRun.label} — Payslips ({selectedRun.payslips?.length || 0})
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Includes base pay, allowances, overtime, approved expenses, and unpaid leave deductions.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {selectedRun.status === "Draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFinalizeRun(selectedRun.id, "approve")}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Approve &amp; Issue
                          </Button>
                        )}
                        {selectedRun.status !== "Paid" && (
                          <Button
                            size="sm"
                            onClick={() => handleFinalizeRun(selectedRun.id, "mark-paid")}
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Mark Paid
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left py-3 px-4 font-medium">Employee</th>
                            <th className="text-right py-3 px-4 font-medium">Base</th>
                            <th className="text-right py-3 px-4 font-medium">Allow. / OT / Exp.</th>
                            <th className="text-right py-3 px-4 font-medium">Deductions</th>
                            <th className="text-right py-3 px-4 font-medium">Net Pay</th>
                            <th className="text-left py-3 px-4 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRun.payslips?.map((ps: any) => (
                            <tr key={ps.id} className="border-b border-border last:border-0">
                              <td className="py-3 px-4">
                                <p className="font-medium text-foreground">{ps.employeeName}</p>
                                <p className="text-muted-foreground">{ps.jobTitle}</p>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {ps.currency} {ps.baseSalary.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right text-success">
                                +{(ps.allowancesTotal + ps.overtimePay + ps.expenseReimbursement + ps.bonusAmount).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right text-destructive">
                                -{(ps.unpaidLeaveDeduction + ps.taxDeduction + ps.otherDeductionsTotal).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-foreground">
                                {ps.currency} {ps.netPay.toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="secondary" className="text-[10px]">
                                  {ps.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {hrAccess && (
              <TabsContent value="compensation" className="mt-4">
                <Card className="border-border">
                  <CardContent className="p-0 overflow-x-auto">
                    {compProfiles.length === 0 ? (
                      <p className="py-12 text-center text-sm text-muted-foreground">
                        Add employees first to configure compensation profiles.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs text-muted-foreground">
                            <th className="text-left py-3 px-4 font-medium">Employee</th>
                            <th className="text-left py-3 px-4 font-medium">Monthly Base</th>
                            <th className="text-left py-3 px-4 font-medium">Bank</th>
                            <th className="text-right py-3 px-4 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compProfiles.map((cp) => (
                            <tr key={cp.employeeId} className="border-b border-border last:border-0">
                              <td className="py-3 px-4">
                                <p className="font-medium text-foreground">{cp.fullName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {cp.jobTitle} · {cp.employeeCode}
                                </p>
                              </td>
                              <td className="py-3 px-4 font-medium">
                                {cp.baseSalary !== null
                                  ? `${cp.currency} ${cp.baseSalary.toLocaleString()}`
                                  : "Not configured"}
                              </td>
                              <td className="py-3 px-4 text-xs text-muted-foreground">
                                {cp.bankName
                                  ? `${cp.bankName} ••••${cp.bankAccountLast4}`
                                  : "—"}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCompModalEmp(cp);
                                    setCompForm({
                                      baseSalary: cp.baseSalary ? String(cp.baseSalary) : "",
                                      currency: cp.currency || "USD",
                                      allowanceAmount: String(cp.allowances?.[0]?.amount || 0),
                                      taxPercent: String(cp.deductions?.[0]?.percent || 10),
                                      bankName: cp.bankName || "",
                                      bankLast4: cp.bankAccountLast4 || "",
                                    });
                                  }}
                                >
                                  {cp.baseSalary !== null ? "Update" : "Set Salary"}
                                </Button>
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

            <TabsContent value="my-payslips" className="mt-4 space-y-4">
              {myPayslips.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No issued payslips yet. Payslips appear here once HR finalizes a payroll run.
                  </CardContent>
                </Card>
              ) : (
                myPayslips.map((ps) => (
                  <Card key={ps.id} className="border-border">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{ps.periodLabel} Payslip</CardTitle>
                        <CardDescription className="text-xs">
                          {ps.employeeName} ({ps.employeeCode}) · {ps.jobTitle}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ps.status === "Paid" ? "default" : "secondary"}>
                          {ps.status}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => window.print()}>
                          <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-t border-border pt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Base Salary</p>
                        <p className="font-medium mt-0.5">
                          {ps.currency} {ps.baseSalary.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gross Pay</p>
                        <p className="font-medium mt-0.5">
                          {ps.currency} {ps.grossPay.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Deductions</p>
                        <p className="font-medium text-destructive mt-0.5">
                          -{ps.currency}{" "}
                          {(ps.taxDeduction + ps.unpaidLeaveDeduction + ps.otherDeductionsTotal).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net Pay</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">
                          {ps.currency} {ps.netPay.toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Create Run Dialog */}
        <Dialog open={runOpen} onOpenChange={setRunOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Monthly Payroll Run</DialogTitle>
              <DialogDescription>
                Auto-calculates gross, overtime, unpaid leave, expenses, tax, and net pay.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRun} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    required
                    value={runYear}
                    onChange={(e) => setRunYear(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Month (1–12)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={runMonth}
                    onChange={(e) => setRunMonth(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Generate Draft Run
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Compensation Dialog */}
        <Dialog open={Boolean(compModalEmp)} onOpenChange={() => setCompModalEmp(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Compensation — {compModalEmp?.fullName}</DialogTitle>
              <DialogDescription>
                Saves a versioned salary revision in PostgreSQL with full audit logging.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveComp} className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input
                    value={compForm.currency}
                    onChange={(e) => setCompForm({ ...compForm, currency: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Monthly Base Salary *</Label>
                  <Input
                    type="number"
                    required
                    placeholder="4500"
                    value={compForm.baseSalary}
                    onChange={(e) => setCompForm({ ...compForm, baseSalary: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Monthly Allowance</Label>
                  <Input
                    type="number"
                    min={0}
                    value={compForm.allowanceAmount}
                    onChange={(e) => setCompForm({ ...compForm, allowanceAmount: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Income Tax (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={compForm.taxPercent}
                    onChange={(e) => setCompForm({ ...compForm, taxPercent: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Bank Name</Label>
                  <Input
                    value={compForm.bankName}
                    onChange={(e) => setCompForm({ ...compForm, bankName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Account Last 4 Digits</Label>
                  <Input
                    maxLength={4}
                    placeholder="4829"
                    value={compForm.bankLast4}
                    onChange={(e) => setCompForm({ ...compForm, bankLast4: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Save Compensation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
