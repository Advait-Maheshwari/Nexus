import { cn } from "@/lib/utils";
import type { ProjectHealth, WorkStatus } from "@/types/domain";

interface StatusPillProps {
  status?: WorkStatus;
  health?: ProjectHealth;
}

const statusLabel: Record<WorkStatus, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived"
};

const healthLabel: Record<ProjectHealth, string> = {
  excellent: "Excellent",
  stable: "Stable",
  at_risk: "At risk",
  critical: "Critical"
};

export function StatusPill({ status, health }: StatusPillProps) {
  const value = status ?? health ?? "stable";
  const label = status ? statusLabel[status] : healthLabel[health ?? "stable"];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
        value === "excellent" || value === "done"
          ? "border-success/35 bg-success/10 text-success"
          : null,
        value === "stable" || value === "ready"
          ? "border-cyan/35 bg-cyan/10 text-cyan"
          : null,
        value === "in_progress"
          ? "border-orbital/40 bg-orbital/10 text-blue-200"
          : null,
        value === "at_risk" || value === "blocked"
          ? "border-solar/40 bg-solar/10 text-solar"
          : null,
        value === "critical"
          ? "border-risk/40 bg-risk/10 text-risk"
          : null,
        value === "backlog" || value === "archived"
          ? "border-white/15 bg-white/[0.05] text-slate-300"
          : null
      )}
    >
      {label}
    </span>
  );
}

