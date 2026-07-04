import { Activity, Clock3, Flag, Orbit } from "lucide-react";

import { formatHours } from "@/lib/utils";
import { StatusPill } from "@/components/StatusPill";
import type { ProjectSummary } from "@/types/domain";

export function ProjectOrbitCard({ project }: { project: ProjectSummary }) {
  return (
    <article className="glass-panel rounded-lg p-4 transition hover:border-cyan/35 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">{project.codename}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{project.name}</h3>
        </div>
        <StatusPill health={project.health} />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${project.progress}%`,
            background: `linear-gradient(90deg, ${project.accent}, rgba(255,255,255,0.88))`
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-300">
        <span className="inline-flex items-center gap-2">
          <Activity size={15} className="text-cyan" />
          {project.progress}% complete
        </span>
        <span className="inline-flex items-center gap-2">
          <Orbit size={15} className="text-violet" />
          {project.taskCount} tasks
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock3 size={15} className="text-solar" />
          {formatHours(project.timeSpentMinutes)}
        </span>
        <span className="inline-flex items-center gap-2">
          <Flag size={15} className="text-risk" />
          {project.deadline ?? "No date"}
        </span>
      </div>
    </article>
  );
}

