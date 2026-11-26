"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth, isHrRole } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Laptop, Plus, UserCheck, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AssetsPage() {
  const { user } = useAuth();
  const hrAccess = isHrRole(user?.role);

  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [assignAsset, setAssignAsset] = useState<any>(null);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "Laptop",
    serialNumber: "",
    purchaseCost: "",
    notes: "",
  });

  const loadData = async () => {
    try {
      const [aRes, eRes] = await Promise.all([
        apiFetch<{ data: any[] }>("/assets"),
        hrAccess ? apiFetch<{ data: any[] }>("/employees") : Promise.resolve({ data: [] }),
      ]);
      setAssets(aRes.data || []);
      setEmployees(eRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user, hrAccess]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/assets", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          serialNumber: form.serialNumber,
          purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : null,
          notes: form.notes,
        }),
      });
      toast.success("Asset registered");
      setAddOpen(false);
      setForm({ name: "", category: "Laptop", serialNumber: "", purchaseCost: "", notes: "" });
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add asset");
    }
  };

  const handleAssign = async () => {
    if (!assignAsset || !selectedEmpId) return;
    try {
      await apiFetch(`/assets/${assignAsset.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ employeeId: selectedEmpId }),
      });
      toast.success("Asset assigned");
      setAssignAsset(null);
      setSelectedEmpId("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Assignment failed");
    }
  };

  const handleReturn = async (id: string) => {
    try {
      await apiFetch(`/assets/${id}/return`, { method: "POST", body: JSON.stringify({}) });
      toast.success("Asset returned to inventory");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Return failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/assets/${id}`, { method: "DELETE" });
      toast.success("Asset removed");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Company Assets</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track laptops, monitors, access badges, and employee hardware assignments.
            </p>
          </div>
          {hrAccess && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Register Asset
            </Button>
          )}
        </div>

        <Card className="border-border">
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-14">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : assets.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <Laptop className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">No assets tracked yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Tag</th>
                    <th className="text-left py-3 px-4 font-medium">Asset</th>
                    <th className="text-left py-3 px-4 font-medium">Serial</th>
                    <th className="text-left py-3 px-4 font-medium">Assigned To</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    {hrAccess && <th className="text-right py-3 px-4 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 font-mono text-xs">{a.assetTag}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.category}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {a.serialNumber || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {a.assignedEmployeeName || <span className="text-muted-foreground">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={a.status === "Assigned" ? "default" : "secondary"}>
                          {a.status}
                        </Badge>
                      </td>
                      {hrAccess && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            {a.status === "Available" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setAssignAsset(a)}
                              >
                                <UserCheck className="h-3.5 w-3.5 mr-1" /> Assign
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleReturn(a.id)}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Return
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(a.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Company Asset</DialogTitle>
              <DialogDescription>Asset tag (AST-XXXX) is generated automatically.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Asset Name *</Label>
                <Input
                  required
                  placeholder="MacBook Pro 14 M4"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                      <SelectItem value="Laptop">Laptop</SelectItem>
                      <SelectItem value="Monitor">Monitor</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Access Card">Access Card</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                      <SelectItem value="Software License">Software License</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Cost ($)</Label>
                  <Input
                    type="number"
                    placeholder="2200"
                    value={form.purchaseCost}
                    onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Serial Number</Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Register Asset
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(assignAsset)} onOpenChange={() => setAssignAsset(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign {assignAsset?.name}</DialogTitle>
              <DialogDescription>Select the employee receiving this asset.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => e.status !== "Terminated")
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeCode})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleAssign} disabled={!selectedEmpId}>
                Confirm Assignment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
