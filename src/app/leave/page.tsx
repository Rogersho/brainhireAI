"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth, isHrRole, isHiringRole } from "@/context/AuthContext";
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
import { CalendarDays, Plus, Check, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LeavePage() {
  const { user } = useAuth();
  const hrAccess = isHrRole(user?.role);
  const canReview = isHiringRole(user?.role);

  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [reqOpen, setReqOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reqForm, setReqForm] = useState({
    leaveTypeId: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    isHalfDay: false,
    reason: "",
  });

  const [holName, setHolName] = useState("");
  const [holDate, setHolDate] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [bRes, tRes, rRes, cRes, hRes] = await Promise.all([
        apiFetch<{ data: any[] }>("/leave/balances/me"),
        apiFetch<{ data: any[] }>("/leave/types"),
        apiFetch<{ data: any[] }>("/leave/requests"),
        apiFetch<{ data: any[] }>("/leave/calendar"),
        apiFetch<{ data: any[] }>("/leave/holidays"),
      ]);
      setBalances(bRes.data || []);
      setLeaveTypes(tRes.data || []);
      setRequests(rRes.data || []);
      setCalendar(cRes.data || []);
      setHolidays(hRes.data || []);
      if (!reqForm.leaveTypeId && tRes.data?.length) {
        setReqForm((prev) => ({ ...prev, leaveTypeId: tRes.data[0].id }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load leave workspace");
    } finally {
      setLoading(false);
    }
  }, [reqForm.leaveTypeId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/leave/requests", {
        method: "POST",
        body: JSON.stringify(reqForm),
      });
      toast.success("Leave request submitted");
      setReqOpen(false);
      setReqForm((prev) => ({ ...prev, reason: "" }));
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (id: string, decision: "Approved" | "Rejected") => {
    try {
      await apiFetch(`/leave/requests/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });
      toast.success(`Leave request ${decision.toLowerCase()}`);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Review failed");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiFetch(`/leave/requests/${id}/cancel`, { method: "PATCH" });
      toast.success("Leave request cancelled");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Cancel failed");
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holName.trim() || !holDate) return;
    try {
      await apiFetch("/leave/holidays", {
        method: "POST",
        body: JSON.stringify({ name: holName, holidayDate: holDate }),
      });
      setHolName("");
      setHolDate("");
      toast.success("Company holiday added");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to add holiday");
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await apiFetch(`/leave/holidays/${id}`, { method: "DELETE" });
      toast.success("Holiday removed");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete holiday");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Leave &amp; PTO Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track annual leave balances, submit time-off requests, approve team absences, and manage holidays.
            </p>
          </div>
          <Button size="sm" onClick={() => setReqOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Request Leave
          </Button>
        </div>

        {/* My Balances */}
        {balances.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {balances.map((b) => (
              <Card key={b.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {b.leaveTypeName}
                    </span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: b.colorHex }}
                    />
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {b.remainingDays}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / {b.allocatedDays}d
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Used {b.usedDays}d · Pending {b.pendingDays}d
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="requests">
            <TabsList>
              <TabsTrigger value="requests">Requests &amp; Approvals ({requests.length})</TabsTrigger>
              <TabsTrigger value="calendar">Out of Office ({calendar.length})</TabsTrigger>
              <TabsTrigger value="policies">Policies &amp; Holidays</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-4">
              <Card className="border-border">
                <CardContent className="p-0 overflow-x-auto">
                  {requests.length === 0 ? (
                    <div className="py-14 text-center text-sm text-muted-foreground">
                      No leave requests yet.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="text-left py-3 px-4 font-medium">Employee</th>
                          <th className="text-left py-3 px-4 font-medium">Leave Type</th>
                          <th className="text-left py-3 px-4 font-medium">Dates</th>
                          <th className="text-left py-3 px-4 font-medium">Days</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-right py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((r) => (
                          <tr key={r.id} className="border-b border-border last:border-0">
                            <td className="py-3 px-4">
                              <p className="font-medium text-foreground">{r.employeeName}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.departmentName || r.jobTitle}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{r.leaveTypeName}</Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(r.startDate).toLocaleDateString()} –{" "}
                              {new Date(r.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 font-medium">{r.totalDays}d</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  r.status === "Approved"
                                    ? "default"
                                    : r.status === "Rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {r.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {r.status === "Pending" && (
                                <div className="flex justify-end gap-1.5">
                                  {canReview && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => handleReview(r.id, "Approved")}
                                      >
                                        <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs text-destructive"
                                        onClick={() => handleReview(r.id, "Rejected")}
                                      >
                                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                                      </Button>
                                    </>
                                  )}
                                  {!canReview && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={() => handleCancel(r.id)}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="mt-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> Team Out-of-Office Schedule
                  </CardTitle>
                  <CardDescription>Approved upcoming and recent absences.</CardDescription>
                </CardHeader>
                <CardContent>
                  {calendar.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Everyone is currently scheduled in.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {calendar.map((ev) => (
                        <div key={ev.id} className="py-3 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium text-foreground">{ev.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              {ev.jobTitle}
                              {ev.departmentName ? ` · ${ev.departmentName}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{ev.leaveTypeName}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(ev.startDate).toLocaleDateString()} –{" "}
                              {new Date(ev.endDate).toLocaleDateString()} ({ev.totalDays}d)
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policies" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Leave Policies</CardTitle>
                  <CardDescription>Annual quotas applied per worker.</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  {leaveTypes.map((lt) => (
                    <div key={lt.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{lt.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lt.isPaid ? "Paid" : "Unpaid"} · Max carryover {lt.maxCarryoverDays}d
                        </p>
                      </div>
                      <Badge variant="secondary">{lt.annualAllowanceDays} days/yr</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Company Holidays</CardTitle>
                  <CardDescription>Excluded automatically from working-day counts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hrAccess && (
                    <form onSubmit={handleAddHoliday} className="flex gap-2">
                      <Input
                        placeholder="Holiday name"
                        value={holName}
                        onChange={(e) => setHolName(e.target.value)}
                      />
                      <Input
                        type="date"
                        value={holDate}
                        onChange={(e) => setHolDate(e.target.value)}
                        className="w-40"
                      />
                      <Button type="submit" size="sm">
                        Add
                      </Button>
                    </form>
                  )}
                  {holidays.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No company holidays configured yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {holidays.map((h) => (
                        <div key={h.id} className="py-2 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{h.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(h.holidayDate).toLocaleDateString()} · {h.locationName}
                            </p>
                          </div>
                          {hrAccess && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteHoliday(h.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={reqOpen} onOpenChange={setReqOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Time Off</DialogTitle>
              <DialogDescription>
                Working days are calculated automatically excluding weekends and company holidays.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitRequest} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Leave Type *</Label>
                <Select
                  value={reqForm.leaveTypeId}
                  onValueChange={(v) => setReqForm({ ...reqForm, leaveTypeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id}>
                        {lt.name} ({lt.isPaid ? "Paid" : "Unpaid"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    required
                    value={reqForm.startDate}
                    onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    required
                    value={reqForm.endDate}
                    onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="half-day">Half-Day Request (0.5 day)</Label>
                <Switch
                  id="half-day"
                  checked={reqForm.isHalfDay}
                  onCheckedChange={(v) => setReqForm({ ...reqForm, isHalfDay: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reason / Handover Notes</Label>
                <Textarea
                  rows={3}
                  value={reqForm.reason}
                  onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving || !reqForm.leaveTypeId}>
                {saving ? "Submitting..." : "Submit Leave Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
