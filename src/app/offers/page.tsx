"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSignature, Plus, Sparkles, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftingAi, setDraftingAi] = useState(false);

  const [form, setForm] = useState({
    applicantId: "",
    proposedSalary: "",
    currency: "USD",
    startDate: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
    employmentType: "Full-Time",
    benefitsSummary: "Health insurance, 20 days annual paid leave, flexible hybrid schedule",
    offerLetterText: "",
  });

  const loadData = async () => {
    try {
      const [oRes, aRes] = await Promise.all([
        apiFetch<{ data: any[] }>("/offers"),
        apiFetch<{ data: any[] }>("/applicants"),
      ]);
      setOffers(oRes.data || []);
      setApplicants(aRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDraftWithAi = async () => {
    const app = applicants.find((a) => a._id === form.applicantId);
    if (!app || !form.proposedSalary) {
      toast.error("Select an applicant and enter proposed salary first.");
      return;
    }
    setDraftingAi(true);
    try {
      const res = await apiFetch<{ data: { offerLetterText: string } }>("/ai/draft-offer", {
        method: "POST",
        body: JSON.stringify({
          candidateName: app.name,
          jobTitle: app.role,
          salary: Number(form.proposedSalary),
          currency: form.currency,
          startDate: form.startDate,
          employmentType: form.employmentType,
          benefits: form.benefitsSummary,
        }),
      });
      setForm((prev) => ({ ...prev, offerLetterText: res.data.offerLetterText || "" }));
      toast.success("Offer letter drafted with AI");
    } catch (err: any) {
      toast.error(err.message || "Failed to draft offer letter");
    } finally {
      setDraftingAi(false);
    }
  };

  const handleCreateOffer = async (sendImmediately: boolean) => {
    if (!form.applicantId || !form.proposedSalary) return;
    setSaving(true);
    try {
      await apiFetch("/offers", {
        method: "POST",
        body: JSON.stringify({
          applicantId: form.applicantId,
          proposedSalary: Number(form.proposedSalary),
          currency: form.currency,
          startDate: form.startDate,
          employmentType: form.employmentType,
          benefitsSummary: form.benefitsSummary,
          offerLetterText: form.offerLetterText,
          sendImmediately,
        }),
      });
      toast.success(sendImmediately ? "Offer sent to candidate!" : "Offer saved as draft");
      setOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create offer");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      await apiFetch(`/offers/${id}/send`, { method: "POST" });
      toast.success("Offer sent to candidate");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to send offer");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/offers/${id}`, { method: "DELETE" });
      toast.success("Offer deleted");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete offer");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Job Offers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Draft AI-assisted offer letters, send formal offers, and track candidate acceptance.
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Offer
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : offers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-2">
              <FileSignature className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">No job offers yet</p>
              <p className="text-xs text-muted-foreground">
                Create an offer for any shortlisted or interviewed candidate.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <Card key={offer.id} className="border-border">
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      <Link href={`/applicants/${offer.applicantId}`} className="hover:underline">
                        {offer.applicantName}
                      </Link>{" "}
                      — {offer.jobTitle}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {offer.currency} {offer.proposedSalary.toLocaleString()} / yr ·{" "}
                      {offer.employmentType} · Starts{" "}
                      {new Date(offer.startDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        offer.status === "Accepted"
                          ? "default"
                          : offer.status === "Declined"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {offer.status}
                    </Badge>
                    {offer.status === "Draft" && (
                      <>
                        <Button size="sm" onClick={() => handleSend(offer.id)}>
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Send
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(offer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                {offer.offerLetterText && (
                  <CardContent className="pt-0">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-muted/30 rounded-md p-4 max-h-44 overflow-y-auto border border-border/60">
                      {offer.offerLetterText}
                    </pre>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Job Offer</DialogTitle>
              <DialogDescription>
                Specify compensation terms and optionally generate a formal letter with NVIDIA AI.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Candidate *</Label>
                <Select
                  value={form.applicantId}
                  onValueChange={(v) => setForm({ ...form, applicantId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select applicant" />
                  </SelectTrigger>
                  <SelectContent>
                    {applicants.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name} — {a.role} ({a.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Annual Salary *</Label>
                  <Input
                    type="number"
                    placeholder="85000"
                    value={form.proposedSalary}
                    onChange={(e) => setForm({ ...form, proposedSalary: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Benefits Summary</Label>
                <Input
                  value={form.benefitsSummary}
                  onChange={(e) => setForm({ ...form, benefitsSummary: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Offer Letter Text</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleDraftWithAi}
                    disabled={draftingAi}
                  >
                    {draftingAi ? (
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1.5" />
                    )}
                    {draftingAi ? "Drafting..." : "Draft with AI"}
                  </Button>
                </div>
                <Textarea
                  rows={8}
                  placeholder="Write or draft your offer letter with AI..."
                  value={form.offerLetterText}
                  onChange={(e) => setForm({ ...form, offerLetterText: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={saving || !form.applicantId || !form.proposedSalary}
                  onClick={() => handleCreateOffer(false)}
                >
                  Save Draft
                </Button>
                <Button
                  disabled={saving || !form.applicantId || !form.proposedSalary}
                  onClick={() => handleCreateOffer(true)}
                >
                  <Send className="h-4 w-4 mr-1.5" /> Save &amp; Send Offer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
