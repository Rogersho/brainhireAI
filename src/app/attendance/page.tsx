"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth, isHiringRole } from "@/context/AuthContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  LogIn,
  LogOut,
  Download,
  Check,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function AttendancePage() {
  const { user } = useAuth();
  const canReview = isHiringRole(user?.role);

  const [todayData, setTodayData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [workMode, setWorkMode] = useState("Office");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);

  const [corrOpen, setCorrOpen] = useState(false);
  const [corrForm, setCorrForm] = useState({
    workDate: new Date().toISOString().slice(0, 10),
    requestedClockIn: "",
    requestedClockOut: "",
    reason: "",
  });

  const loadAll = useCallback(async () => {
    try {
      const [tRes, lRes, cRes] = await Promise.all([
        apiFetch<{ data: any }>("/attendance/today"),
        apiFetch<{ data: any[] }>(`/attendance?month=${month}`),
        apiFetch<{ data: any[] }>("/attendance/corrections"),
      ]);
      setTodayData(tRes.data);
      setLogs(lRes.data || []);
      setCorrections(cRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleClockIn = async () => {
    setPunching(true);
    try {
      await apiFetch("/attendance/clock-in", {
        method: "POST",
        body: JSON.stringify({ workMode }),
      });
      toast.success("Clocked in for today");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Clock-in failed");
    } finally {
      setPunching(false);
    }
  };

  const handleClockOut = async () => {
    setPunching(true);
    try {
      await apiFetch("/attendance/clock-out", {
        method: "POST",
        body: JSON.stringify({ breakMinutes: Number(breakMinutes) || 0 }),
      });
      toast.success("Clocked out — hours logged");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Clock-out failed");
    } finally {
      setPunching(false);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/attendance/corrections", {
        method: "POST",
        body: JSON.stringify({
          workDate: corrForm.workDate,
          requestedClockIn: corrForm.requestedClockIn
            ? new Date(`${corrForm.workDate}T${corrForm.requestedClockIn}`).toISOString()
            : null,
          requestedClockOut: corrForm.requestedClockOut
            ? new Date(`${corrForm.workDate}T${corrForm.requestedClockOut}`).toISOString()
            : null,
          reason: corrForm.reason,
        }),
      });
      toast.success("Attendance correction submitted");
      setCorrOpen(false);
      setCorrForm({
        workDate: new Date().toISOString().slice(0, 10),
        requestedClockIn: "",
        requestedClockOut: "",
        reason: "",
      });
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit correction");
    }
  };

  const handleReviewCorrection = async (id: string, decision: "Approved" | "Rejected") => {
    try {
      await apiFetch(`/attendance/corrections/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });
      toast.success(`Correction ${decision.toLowerCase()}`);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to review correction");
    }
  };

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = [
      "Date",
      "Employee",
      "Code",
      "Clock In",
      "Clock Out",
      "Total Hours",
      "Overtime",
      "Mode",
      "Status",
    ];
    const rows = logs.map((l) => [
      l.workDate?.slice(0, 10) || "",
      l.employeeName || "",
      l.employeeCode || "",
      l.clockIn ? new Date(l.clockIn).toLocaleTimeString() : "",
      l.clockOut ? new Date(l.clockOut).toLocaleTimeString() : "",
      l.totalHours,
      l.overtimeHours,
      l.workMode,
      l.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hoobe-hr-attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayLog = todayData?.todayLog;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Attendance &amp; Time Tracking
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Daily clock-in/out, shift hours, overtime tracking, and correction approvals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-40 h-9"
            />
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-1.5" /> CSV
            </Button>
          </div>
        </div>

        {/* Today's Clock-In / Clock-Out Widget */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Today&apos;s Shift ({new Date().toLocaleDateString()})
            </CardTitle>
            {todayData?.schedule && (
              <CardDescription className="text-xs">
                Standard shift: {todayData.schedule.startTime?.slice(0, 5)} –{" "}
                {todayData.schedule.endTime?.slice(0, 5)} ({todayData.schedule.dailyHours}h)
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : !todayData?.employeeLinked ? (
              <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span>
                  Your account isn&apos;t linked to an employee profile yet. Create an employee record with your work email to clock in.
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/employees">Go to Employees</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={todayLog ? "default" : "secondary"} className="mt-1">
                      {todayLog ? todayLog.status : "Not Clocked In"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clock In</p>
                    <p className="font-medium mt-1">
                      {todayLog?.clockIn ? new Date(todayLog.clockIn).toLocaleTimeString() : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clock Out</p>
                    <p className="font-medium mt-1">
                      {todayLog?.clockOut ? new Date(todayLog.clockOut).toLocaleTimeString() : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                    <p className="font-medium mt-1">
                      {todayLog?.totalHours ? `${todayLog.totalHours}h` : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!todayLog?.clockIn ? (
                    <>
                      <Select value={workMode} onValueChange={setWorkMode}>
                        <SelectTrigger className="w-28 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Office">Office</SelectItem>
                          <SelectItem value="Remote">Remote</SelectItem>
                          <SelectItem value="Field">Field</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleClockIn} disabled={punching}>
                        <LogIn className="h-4 w-4 mr-1.5" /> Clock In
                      </Button>
                    </>
                  ) : !todayLog?.clockOut ? (
                    <>
                      <Input
                        type="number"
                        min={0}
                        max={180}
                        placeholder="Break (min)"
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(e.target.value)}
                        className="w-28 h-9"
                      />
                      <Button variant="destructive" onClick={handleClockOut} disabled={punching}>
                        <LogOut className="h-4 w-4 mr-1.5" /> Clock Out
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-success border-success/40">
                      Shift Complete
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setCorrOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Correction
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="logs">
          <TabsList>
            <TabsTrigger value="logs">Timesheet Logs ({logs.length})</TabsTrigger>
            <TabsTrigger value="corrections">
              Correction Requests ({corrections.filter((c) => c.status === "Pending").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="mt-4">
            <Card className="border-border">
              <CardContent className="p-0 overflow-x-auto">
                {logs.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No attendance records for {month}.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Employee</th>
                        <th className="text-left py-3 px-4 font-medium">Clock In</th>
                        <th className="text-left py-3 px-4 font-medium">Clock Out</th>
                        <th className="text-left py-3 px-4 font-medium">Hours</th>
                        <th className="text-left py-3 px-4 font-medium">Mode</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id} className="border-b border-border last:border-0">
                          <td className="py-3 px-4 font-medium">
                            {new Date(l.workDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-foreground">{l.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{l.employeeCode}</p>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {l.clockIn ? new Date(l.clockIn).toLocaleTimeString() : "—"}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {l.clockOut ? new Date(l.clockOut).toLocaleTimeString() : "—"}
                          </td>
                          <td className="py-3 px-4">
                            {l.totalHours}h
                            {l.overtimeHours > 0 && (
                              <span className="text-xs text-primary ml-1">
                                (+{l.overtimeHours}h OT)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{l.workMode}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                l.status === "Present"
                                  ? "default"
                                  : l.status === "Late"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[11px]"
                            >
                              {l.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="corrections" className="mt-4">
            <Card className="border-border">
              <CardContent className="p-0 overflow-x-auto">
                {corrections.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No attendance correction requests.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-3 px-4 font-medium">Employee</th>
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Reason</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        {canReview && <th className="text-right py-3 px-4 font-medium">Review</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {corrections.map((c) => (
                        <tr key={c.id} className="border-b border-border last:border-0">
                          <td className="py-3 px-4 font-medium">{c.employeeName}</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(c.workDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{c.reason}</td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary">{c.status}</Badge>
                          </td>
                          {canReview && (
                            <td className="py-3 px-4 text-right">
                              {c.status === "Pending" && (
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleReviewCorrection(c.id, "Approved")}
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-destructive"
                                    onClick={() => handleReviewCorrection(c.id, "Rejected")}
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={corrOpen} onOpenChange={setCorrOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Attendance Correction</DialogTitle>
              <DialogDescription>Submit missed clock-in or clock-out details for review.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitCorrection} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Work Date *</Label>
                <Input
                  type="date"
                  required
                  value={corrForm.workDate}
                  onChange={(e) => setCorrForm({ ...corrForm, workDate: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Clock In Time</Label>
                  <Input
                    type="time"
                    value={corrForm.requestedClockIn}
                    onChange={(e) => setCorrForm({ ...corrForm, requestedClockIn: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Clock Out Time</Label>
                  <Input
                    type="time"
                    value={corrForm.requestedClockOut}
                    onChange={(e) => setCorrForm({ ...corrForm, requestedClockOut: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason *</Label>
                <Input
                  required
                  placeholder="Forgot to clock out after client call"
                  value={corrForm.reason}
                  onChange={(e) => setCorrForm({ ...corrForm, reason: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
