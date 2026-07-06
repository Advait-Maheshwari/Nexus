import { lazy, Suspense, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Dna,
  Factory,
  Lightbulb,
  NotebookPen,
  Orbit,
  Settings,
  UserCircle
} from "lucide-react";

import { ProjectOrbitCard } from "@/components/ProjectOrbitCard";
import { StatusPill } from "@/components/StatusPill";
import type { MissionData, TimelineNode } from "@/types/domain";

const GalaxyScene = lazy(() => import("@/scenes/GalaxyScene"));

export function GalaxyView({ data }: { data: MissionData }) {
  const [selectedProjectId, setSelectedProjectId] = useState(data.projects[0]?.id ?? "");
  const selectedProject = data.projects.find((project) => project.id === selectedProjectId);
  const linkedProjects = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    return data.relationships
      .filter(
        (relationship) =>
          relationship.sourceProjectId === selectedProject.id ||
          relationship.targetProjectId === selectedProject.id
      )
      .map((relationship) => {
        const linkedId =
          relationship.sourceProjectId === selectedProject.id
            ? relationship.targetProjectId
            : relationship.sourceProjectId;
        return {
          relationship,
          project: data.projects.find((project) => project.id === linkedId)
        };
      })
      .filter((link) => link.project);
  }, [data.projects, data.relationships, selectedProject]);

  return (
    <section className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[1fr_360px]">
      <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-white/10 bg-void">
        <Suspense fallback={<div className="h-full w-full bg-void" />}>
          <GalaxyScene
            projects={data.projects}
            relationships={data.relationships}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
          />
        </Suspense>
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/10 bg-void/80 px-3 py-2 backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Navigation
          </p>
          <p className="mt-1 text-xs text-slate-300">Select a star / drag to orbit / scroll to zoom</p>
        </div>
      </div>
      <div className="space-y-3">
        {selectedProject ? (
          <>
            <ProjectOrbitCard project={selectedProject} />
            <section className="glass-panel rounded-lg p-4">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-violet">
                Feature Planets
              </p>
              <div className="mt-3 space-y-2">
                {selectedProject.planets.map((planet) => (
                  <div
                    key={planet.id}
                    className="rounded-md border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">{planet.name}</span>
                      <span className="font-mono text-xs text-cyan">{planet.progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
                        style={{ width: `${planet.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="glass-panel rounded-lg p-4">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">
                Constellation Links
              </p>
              <div className="mt-3 space-y-3">
                {linkedProjects.length > 0 ? (
                  linkedProjects.map(({ relationship, project }) => (
                    <button
                      key={relationship.id}
                      type="button"
                      onClick={() => project && setSelectedProjectId(project.id)}
                      className="w-full rounded-md border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-cyan/30 hover:bg-cyan/[0.06]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">{project?.name}</span>
                        <span className="font-mono text-xs text-cyan">
                          {Math.round(relationship.strength * 100)}%
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{relationship.label}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No active links in this constellation.</p>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="glass-panel rounded-lg p-5 text-sm text-slate-300">
            Select a project star to inspect its system.
          </section>
        )}
      </div>
    </section>
  );
}

export function TimelineView({ data }: { data: MissionData }) {
  return (
    <section className="glass-panel min-h-[calc(100vh-8rem)] rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-violet">DNA</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Timeline</h2>
        </div>
        <Dna className="text-violet" size={26} />
      </div>

      <div className="relative mt-10 grid gap-5">
        <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-cyan via-violet to-solar md:left-1/2" />
        {data.timeline.map((node, index) => (
          <TimelineRow key={node.id} node={node} index={index} />
        ))}
      </div>
    </section>
  );
}

function TimelineRow({ node, index }: { node: TimelineNode; index: number }) {
  const done = node.status === "done";
  return (
    <motion.article
      className={`relative grid gap-3 pl-12 md:grid-cols-2 md:pl-0 ${
        index % 2 === 0 ? "" : "md:[&>*:first-child]:col-start-2"
      }`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <span className="absolute left-1 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-cyan/35 bg-void text-cyan md:left-[calc(50%-14px)]">
        {done ? <CheckCircle2 size={15} /> : <span className="h-2 w-2 rounded-full bg-current" />}
      </span>
      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">{node.date}</p>
        <h3 className="mt-2 text-lg font-semibold text-white">{node.label}</h3>
        <div className="mt-3 flex items-center gap-2">
          <StatusPill status={node.status} />
          <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-400">
            {node.type}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

export function AnalyticsView({ data }: { data: MissionData }) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {data.projects.map((project) => (
        <article key={project.id} className="glass-panel rounded-lg p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
                {project.codename}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">{project.name}</h2>
            </div>
            <BarChart3 className="text-cyan" size={22} />
          </div>
          <div className="mt-5 space-y-4">
            <Bar label="Completion" value={project.progress} color={project.accent} />
            <Bar label="Health" value={project.healthScore} color="#4ade80" />
            <Bar label="Velocity" value={Math.min(100, project.velocity * 10)} color="#f5c451" />
          </div>
        </article>
      ))}
    </section>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-slate-200">{Math.round(value)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

const placeholderConfig = {
  city: { icon: Factory, title: "City Builder", accent: "text-solar" },
  calendar: { icon: CalendarDays, title: "Calendar", accent: "text-cyan" },
  ideas: { icon: Lightbulb, title: "Ideas", accent: "text-solar" },
  journal: { icon: NotebookPen, title: "Journal", accent: "text-violet" },
  settings: { icon: Settings, title: "Settings", accent: "text-slate-200" },
  profile: { icon: UserCircle, title: "Profile", accent: "text-cyan" }
};

export function PlaceholderView({ view }: { view: keyof typeof placeholderConfig }) {
  const config = placeholderConfig[view];
  const Icon = config.icon;

  return (
    <section className="glass-panel flex min-h-[calc(100vh-8rem)] items-center justify-center rounded-lg p-8 text-center">
      <div className="max-w-md">
        <Icon className={`mx-auto ${config.accent}`} size={42} />
        <h2 className="mt-5 text-3xl font-semibold text-white">{config.title}</h2>
        <div className="mx-auto mt-6 h-2 max-w-xs overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan via-violet to-solar" />
        </div>
      </div>
    </section>
  );
}
