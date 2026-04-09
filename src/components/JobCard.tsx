"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface JobCardProps {
  job: any;
  isCandidate: boolean;
  onEdit?: (job: any) => void;
  onDelete?: (job: any) => void;
}

export function JobCard({ job, isCandidate, onEdit, onDelete }: JobCardProps) {
  return (
    <Card className="border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-heading font-semibold text-foreground">{job.title}</h3>
            <p className="text-sm text-muted-foreground">{job.department} · {job.location}</p>
            {!isCandidate && job.createdBy && (
              <p className="text-xs text-muted-foreground mt-1">By: {typeof job.createdBy === 'object' ? job.createdBy.name : 'You'}</p>
            )}
          </div>
          <Badge variant={job.status === "Active" ? "default" : job.status === "Paused" ? "secondary" : "outline"}>
            {job.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {!isCandidate ? (
              <>
                <Users className="h-4 w-4" />
                View applicants
              </>
            ) : (
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">Full-Time</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Posted: {new Date(job.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/jobs/${job._id}`}>
              <Eye className="mr-2 h-3 w-3" /> {isCandidate ? "View Details & Apply" : "View Details"}
            </Link>
          </Button>
          {!isCandidate && (
            <>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(job)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(job)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
