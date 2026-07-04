import { lazy, Suspense } from "react";
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
import { Button } from "@/components/ui/Button";
import type { MissionData, ProjectSummary, TimelineNode } from "@/types/domain";

const GalaxyScene = lazy(() => import("@/scenes/GalaxyScene"));

export function ProjectsView({ data }: { data: MissionData }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-3 md:grid-cols-2">
        {data.projects.map((project) => (
          <ProjectOrbitCard key={project.id} project={project} />
        ))}
      </div>
      <ProjectDetails project={data.projects[0]} />
    </section>
  );
}

function ProjectDetails({ project }: { project: ProjectSummary }) {
  return (
    <aside className="glass-panel rounded-lg p-5">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">{project.codename}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{project.name}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill status={project.status} />
        <StatusPill health={project.health} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Detail label="Features" value={project.featureCount.toString()} />
        <Detail label="Tasks" value={project.taskCount.toString()} />
        <Detail label="Velocity" value={project.velocity.toFixed(1)} />
        <Detail label="Blocked" value={project.blockedTaskCount.toString()} />
      </div>
      <Button className="mt-5 w-full" variant="primary">
        Open Project
      </Button>
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function GalaxyView({ data }: { data: MissionData }) {
  return (
    <section className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[1fr_360px]">
      <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-white/10 bg-void">
        <Suspense fallback={<div className="h-full w-full bg-void" />}>
          <GalaxyScene projects={data.projects} relationships={data.relationships} />
        </Suspense>
      </div>
      <div className="space-y-3">
        <section className="glass-panel rounded-lg p-4">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">
            Constellation Links
          </p>
          <div className="mt-3 space-y-3">
            {data.relationships.map((relationship) => (
              <div
                key={relationship.id}
                className="rounded-md border border-white/10 bg-white/[0.04] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{relationship.type}</span>
                  <span className="font-mono text-xs text-cyan">
                    {Math.round(relationship.strength * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{relationship.label}</p>
              </div>
            ))}
          </div>
        </section>
        {data.projects.map((project) => (
          <ProjectOrbitCard key={project.id} project={project} />
        ))}
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
