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
import { LifeBuoy, Plus, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function HelpdeskPage() {
  const { user } = useAuth();
  const hrAccess = isHrRole(user?.role);

  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);

  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    category: "Payroll",
    priority: "Medium",
    subject: "",
    description: "",
  });

  const loadTickets = async () => {
    try {
      const res = await apiFetch<{ data: any[] }>("/helpdesk/tickets");
      setTickets(res.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load HR tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const openTicket = async (t: any) => {
    setSelected(t);
    try {
      const res = await apiFetch<{ data: any[] }>(`/helpdesk/tickets/${t.id}/messages`);
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/helpdesk/tickets", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("HR support ticket opened");
      setNewOpen(false);
      setForm({ category: "Payroll", priority: "Medium", subject: "", description: "" });
      await loadTickets();
    } catch (err: any) {
      toast.error(err.message || "Failed to create ticket");
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    try {
      await apiFetch(`/helpdesk/tickets/${selected.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: replyText }),
      });
      setReplyText("");
      await openTicket(selected);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/helpdesk/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(`Ticket marked ${status}`);
      await loadTickets();
      setSelected((prev: any) => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch (err: any) {
      toast.error(err.message || "Status update failed");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">HR Helpdesk</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submit payroll, leave, IT, or document requests directly to People Operations.
            </p>
          </div>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Ticket
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-5 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tickets ({tickets.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No support tickets yet.
                </div>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTicket(t)}
                    className={`w-full text-left p-4 hover:bg-muted/40 transition-colors ${
                      selected?.id === t.id ? "bg-muted/60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.ticketNumber}
                      </span>
                      <Badge
                        variant={
                          t.status === "Resolved" || t.status === "Closed"
                            ? "default"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm text-foreground mt-1 truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.employeeName} · {t.category} · {t.priority}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-7 border-border">
            {!selected ? (
              <CardContent className="py-20 text-center space-y-2">
                <LifeBuoy className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">Select a ticket to view conversation</p>
              </CardContent>
            ) : (
              <>
                <CardHeader className="pb-3 border-b border-border flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      {selected.ticketNumber}: {selected.subject}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Opened by {selected.employeeName} · {selected.category} · Priority:{" "}
                      {selected.priority}
                    </CardDescription>
                  </div>
                  {hrAccess && (
                    <Select
                      value={selected.status}
                      onValueChange={(v) => handleUpdateStatus(selected.id, v)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Waiting on Employee">Waiting</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="p-3.5 rounded-md bg-muted/40 text-sm text-foreground">
                    {selected.description}
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {messages.map((m) => (
                      <div key={m.id} className="p-3 rounded-md border border-border text-xs space-y-1">
                        <div className="flex justify-between text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {m.senderName} ({m.senderRole})
                          </span>
                          <span>{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-foreground">{m.body}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleReply} className="flex gap-2 pt-2 border-t border-border">
                    <Input
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <Button type="submit" size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>

        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open HR Support Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTicket} className="space-y-4 mt-2">
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
                      <SelectItem value="Payroll">Payroll</SelectItem>
                      <SelectItem value="Leave">Leave</SelectItem>
                      <SelectItem value="Benefits">Benefits</SelectItem>
                      <SelectItem value="IT / Access">IT / Access</SelectItem>
                      <SelectItem value="Workplace">Workplace</SelectItem>
                      <SelectItem value="Document Request">Document Request</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Subject *</Label>
                <Input
                  required
                  placeholder="Employment verification letter needed"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Details *</Label>
                <Textarea
                  rows={4}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Submit Ticket
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
