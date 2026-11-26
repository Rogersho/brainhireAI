"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth, isHiringRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Receipt, Plus, Check, X, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ExpensesPage() {
  const { user } = useAuth();
  const canReview = isHiringRole(user?.role);

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "Travel",
    amount: "",
    currency: "USD",
    expenseDate: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const loadData = async () => {
    try {
      const res = await apiFetch<{ data: any[] }>("/expenses");
      setExpenses(res.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("category", form.category);
      fd.append("amount", form.amount);
      fd.append("currency", form.currency);
      fd.append("expenseDate", form.expenseDate);
      fd.append("description", form.description);
      if (receiptFile) fd.append("receipt", receiptFile);

      await apiFetch("/expenses", { method: "POST", body: fd });
      toast.success("Expense claim submitted");
      setOpen(false);
      setForm({
        title: "",
        category: "Travel",
        amount: "",
        currency: "USD",
        expenseDate: new Date().toISOString().slice(0, 10),
        description: "",
      });
      setReceiptFile(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit expense");
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (id: string, decision: "Approved" | "Rejected") => {
    try {
      await apiFetch(`/expenses/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });
      toast.success(`Expense ${decision.toLowerCase()}`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Review failed");
    }
  };

  const handleOpenReceipt = async (id: string) => {
    try {
      const res = await apiFetch<{ data: { url: string } }>(`/expenses/${id}/receipt`);
      if (res.data?.url) window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err.message || "Could not open receipt");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Expense Claims &amp; Reimbursements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload S3 receipts, review team expenses, and automatically reimburse approved claims in payroll.
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Submit Expense
          </Button>
        </div>

        <Card className="border-border">
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-14">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <Receipt className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">No expense claims yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Employee</th>
                    <th className="text-left py-3 px-4 font-medium">Expense</th>
                    <th className="text-left py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Receipt</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    {canReview && <th className="text-right py-3 px-4 font-medium">Review</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((ex) => (
                    <tr key={ex.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{ex.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ex.expenseDate).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{ex.title}</p>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {ex.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {ex.currency} {ex.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {ex.hasReceipt ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleOpenReceipt(ex.id)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> View
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            ex.status === "Reimbursed" || ex.status === "Approved"
                              ? "default"
                              : ex.status === "Rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {ex.status}
                        </Badge>
                      </td>
                      {canReview && (
                        <td className="py-3 px-4 text-right">
                          {ex.status === "Pending" && (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleReview(ex.id, "Approved")}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive"
                                onClick={() => handleReview(ex.id, "Rejected")}
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Expense Claim</DialogTitle>
              <DialogDescription>Attach an optional receipt stored securely in Neon S3.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  required
                  placeholder="Client flight & hotel"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Meals">Meals</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Receipt (PDF / Image)</Label>
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Submitting..." : "Submit Claim"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
