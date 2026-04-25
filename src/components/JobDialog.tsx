"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface JobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  title: string;
  loading: boolean;
  error: string | null;
}

export function JobDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title,
  loading,
  error
}: JobDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    location: "",
    description: "",
    skills: "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: initialData?.title || "",
        department: initialData?.department || "",
        location: initialData?.location || "",
        description: initialData?.description || "",
        skills: Array.isArray(initialData?.skills) ? initialData.skills.join(", ") : "",
      });
    }
  }, [open]); // Only depend on 'open' status

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => { if (loading) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          <DialogDescription className="sr-only">Fill out the details for the job posting.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="job-title">Job Title *</Label>
            <Input
              id="job-title"
              placeholder="e.g. Senior Frontend Developer"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job-dept">Department *</Label>
              <Input
                id="job-dept"
                placeholder="Engineering"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-loc">Location *</Label>
              <Input
                id="job-loc"
                placeholder="Remote"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-desc">Description</Label>
            <Textarea
              id="job-desc"
              placeholder="Describe the role, responsibilities, and requirements..."
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-skills">Required Skills (comma-separated)</Label>
            <Input
              id="job-skills"
              placeholder="React, TypeScript, Node.js"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Processing..." : (initialData ? "Update Job" : "Publish Job")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
