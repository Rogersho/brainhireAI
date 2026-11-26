"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OrgNode {
  id: string;
  fullName: string;
  jobTitle: string;
  departmentName: string | null;
  employeeCode: string;
  managerId: string | null;
  children: OrgNode[];
}

function OrgTreeBranch({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  return (
    <div className={depth > 0 ? "ml-6 pl-5 border-l border-border mt-3" : "mt-4"}>
      <Link
        href={`/employees/${node.id}`}
        className="inline-flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card hover:border-foreground/30 transition-colors min-w-[260px]"
      >
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {node.fullName
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{node.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{node.jobTitle}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {node.departmentName && (
              <Badge variant="secondary" className="text-[10px]">
                {node.departmentName}
              </Badge>
            )}
            {node.children.length > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" /> {node.children.length}
              </span>
            )}
          </div>
        </div>
      </Link>

      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <OrgTreeBranch key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: any[] }>("/employees/org-chart")
      .then((res) => setEmployees(res.data || []))
      .catch((err) => toast.error(err.message || "Failed to load org chart"))
      .finally(() => setLoading(false));
  }, []);

  const roots = useMemo(() => {
    const map = new Map<string, OrgNode>();
    employees.forEach((e) => {
      map.set(e.id, {
        id: e.id,
        fullName: e.fullName,
        jobTitle: e.jobTitle,
        departmentName: e.departmentName,
        employeeCode: e.employeeCode,
        managerId: e.managerId,
        children: [],
      });
    });

    const topLevel: OrgNode[] = [];
    map.forEach((node) => {
      if (node.managerId && map.has(node.managerId)) {
        map.get(node.managerId)!.children.push(node);
      } else {
        topLevel.push(node);
      }
    });
    return topLevel;
  }, [employees]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Organization Chart</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live reporting hierarchy across all active departments and teams.
          </p>
        </div>

        <Card className="border-border">
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : roots.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Network className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">No active employees yet</p>
                <p className="text-xs text-muted-foreground">
                  Add employees and assign reporting managers in the Employee Directory to visualize your org tree.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                {roots.map((root) => (
                  <OrgTreeBranch key={root.id} node={root} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
