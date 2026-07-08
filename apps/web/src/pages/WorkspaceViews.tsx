import { lazy, Suspense, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Factory,
  Lightbulb,
  NotebookPen,
  Orbit,
  Settings,
  UserCircle,
  Waypoints
} from "lucide-react";

import { ProjectOrbitCard } from "@/components/ProjectOrbitCard";
import { StatusPill } from "@/components/StatusPill";
import type { MissionData, TimelineNode } from "@/types/domain";
import type { TimeTunnelMode } from "@/scenes/TimeTunnelScene";

const GalaxyScene = lazy(() => import("@/scenes/GalaxyScene"));
const TimeTunnelScene = lazy(() => import("@/scenes/TimeTunnelScene"));

export function GalaxyView({ data }: { data: MissionData }) {
  const [selectedProjectId, setSelectedProjectId] = useState(data.projects[0]?.id ?? "");
  const [selectedPlanetId, setSelectedPlanetId] = useState(
    data.projects[0]?.planets[0]?.id ?? ""
  );
  const selectedProject = data.projects.find((project) => project.id === selectedProjectId);
  const selectedPlanet = selectedProject?.planets.find(
    (planet) => planet.id === selectedPlanetId
  );
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
            selectedPlanetId={selectedPlanetId}
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId);
              const project = data.projects.find((item) => item.id === projectId);
              setSelectedPlanetId(project?.planets[0]?.id ?? "");
            }}
            onSelectPlanet={(projectId, planetId) => {
              setSelectedProjectId(projectId);
              setSelectedPlanetId(planetId);
            }}
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
              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <PlanetMetric label="Solar health" value={selectedProject.healthScore} />
                <PlanetMetric label="Gravity" value={selectedProject.priority} />
                <PlanetMetric label="Velocity" value={selectedProject.velocity.toFixed(1)} />
              </div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-violet">
                Feature Planets
              </p>
              <div className="mt-3 space-y-2">
                {selectedProject.planets.map((planet) => (
                  <button
                    key={planet.id}
                    type="button"
                    onClick={() => setSelectedPlanetId(planet.id)}
                    className={`w-full rounded-md border p-3 text-left transition ${
                      selectedPlanetId === planet.id
                        ? "border-violet/45 bg-violet/10"
                        : "border-white/10 bg-white/[0.04] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">{planet.name}</span>
                      <span className="font-mono text-xs text-cyan">{planet.progress}%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {planetClass(planet.progress, planet.blockedTaskCount)}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
                        style={{ width: `${planet.progress}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
              {selectedPlanet ? (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
                    <PlanetMetric label="Moons" value={selectedPlanet.taskCount} />
                    <PlanetMetric label="Blocked" value={selectedPlanet.blockedTaskCount} />
                    <PlanetMetric label="Progress" value={`${selectedPlanet.progress}%`} />
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="text-xs text-slate-400">Task moon signal</span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: Math.min(8, selectedPlanet.taskCount) }, (_, index) => (
                        <span
                          key={`${selectedPlanet.id}-signal-${index}`}
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              index < selectedPlanet.blockedTaskCount
                                ? "#fb7185"
                                : index / Math.min(8, selectedPlanet.taskCount) <
                                    selectedPlanet.progress / 100
                                  ? "#4ade80"
                                  : "#64748b"
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Planet Readout
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {planetReadout(selectedPlanet.progress, selectedPlanet.blockedTaskCount)}
                    </p>
                  </div>
                </>
              ) : null}
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
                      onClick={() => {
                        if (project) {
                          setSelectedProjectId(project.id);
                          setSelectedPlanetId(project.planets[0]?.id ?? "");
                        }
                      }}
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

function planetClass(progress: number, blocked: number) {
  if (blocked > 0) return "unstable red-zone planet";
  if (progress >= 75) return "mature green world";
  if (progress >= 45) return "forming ocean world";
  return "early construction moon-world";
}

function planetReadout(progress: number, blocked: number) {
  if (blocked > 0) {
    return "This planet has blocked task moons. Clear damage before expanding its orbit.";
  }
  if (progress >= 75) {
    return "This feature world is stable and can support polish, automation, or documentation.";
  }
  if (progress >= 45) {
    return "This planet is mid-formation. Add one focused task to push it into stable orbit.";
  }
  return "This is an early feature world. Keep its next task small and concrete.";
}

function PlanetMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white/[0.04] px-2 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function TimelineView({ data }: { data: MissionData }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState<TimeTunnelMode>("mission");
  const activeNode = data.timeline[activeIndex];
  const nextAction = useMemo(() => {
    const candidate =
      data.timeline.find((node) => node.status === "in_progress") ??
      data.timeline.find((node) => node.status === "ready") ??
      data.timeline.find((node) => node.status === "backlog");
    return candidate ?? data.timeline[data.timeline.length - 1];
  }, [data.timeline]);
  const riskCount = data.timeline.filter(
    (node) => node.status === "blocked" || (mode === "risk" && node.status !== "done")
  ).length;
  const completedCount = data.timeline.filter((node) => node.status === "done").length;
  const futureCount = data.timeline.filter((_, index) => index > activeIndex).length;

  return (
    <section
      className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
      onWheel={(event) => {
        if (Math.abs(event.deltaY) < 8) return;
        setActiveIndex((current) =>
          Math.max(0, Math.min(data.timeline.length - 1, current + (event.deltaY > 0 ? 1 : -1)))
        );
      }}
    >
      <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-white/10 bg-void">
        <Suspense fallback={<div className="h-full bg-void" />}>
          <TimeTunnelScene nodes={data.timeline} activeIndex={activeIndex} mode={mode} onSelect={setActiveIndex} />
        </Suspense>
        <div className="pointer-events-none absolute left-4 top-4">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Time Tunnel</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Project Time Corridor</h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Completed work recedes behind you. Today stays centered. Deadlines and risks appear ahead.
          </p>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
          <TunnelModeButton active={mode === "mission"} onClick={() => setMode("mission")}>
            Mission
          </TunnelModeButton>
          <TunnelModeButton active={mode === "risk"} onClick={() => setMode("risk")}>
            Risk Scan
          </TunnelModeButton>
          <TunnelModeButton active={mode === "forecast"} onClick={() => setMode("forecast")}>
            Forecast
          </TunnelModeButton>
        </div>
      </div>
      <aside className="space-y-3">
        {activeNode ? (
          <section className="glass-panel rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <Waypoints className="text-cyan" size={24} />
              <StatusPill status={activeNode.status} />
            </div>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-cyan">
              {activeNode.date}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">{activeNode.label}</h3>
            <p className="mt-2 text-sm capitalize text-slate-400">{activeNode.type}</p>
            <p className="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-slate-300">
              {describeTunnelNode(activeNode, activeIndex, data.timeline.length)}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                aria-label="Previous timeline node"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
                className="h-10 flex-1 rounded-md border border-white/10 text-sm text-slate-300 disabled:opacity-30"
              >
                Previous
              </button>
              <button
                type="button"
                aria-label="Next timeline node"
                disabled={activeIndex === data.timeline.length - 1}
                onClick={() => setActiveIndex((index) => Math.min(data.timeline.length - 1, index + 1))}
                className="h-10 flex-1 rounded-md border border-cyan/25 bg-cyan/10 text-sm text-cyan disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </section>
        ) : null}
        <section className="glass-panel rounded-lg p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Tunnel Signal</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <PlanetMetric label="Done" value={completedCount} />
            <PlanetMetric label="Risks" value={riskCount} />
            <PlanetMetric label="Ahead" value={futureCount} />
          </div>
          {nextAction ? (
            <div className="mt-3 rounded-md border border-solar/20 bg-solar/10 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-solar">
                AI Next Move
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{nextAction.label}</p>
              <p className="mt-1 text-xs text-slate-400">{nextAction.date}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {mode === "risk"
                  ? "Clear blockers before adding new future commitments."
                  : mode === "forecast"
                    ? "Keep future items visible, but only promote one near-term task at a time."
                    : "Make this the next concrete action in today's execution lane."}
              </p>
            </div>
          ) : null}
        </section>
        <section className="glass-panel rounded-lg p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Timeline</p>
          <div className="mt-3 space-y-1">
            {data.timeline.map((node, index) => (
              <button
                key={node.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                  index === activeIndex ? "bg-cyan/15 text-white" : "text-slate-400 hover:bg-white/[0.04]"
                }`}
              >
                <span className="font-mono text-[10px] text-slate-600">{String(index + 1).padStart(2, "0")}</span>
                <span className="truncate">{node.label}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}

function TunnelModeButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-xs font-medium transition backdrop-blur-md ${
        active
          ? "border-cyan/45 bg-cyan/15 text-cyan shadow-glow"
          : "border-white/10 bg-void/70 text-slate-300 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function describeTunnelNode(node: TimelineNode, index: number, total: number) {
  if (node.status === "blocked") {
    return "This point is a red hazard in the tunnel. Clear its blocker before trusting later work.";
  }
  if (node.status === "done") {
    return "This checkpoint is behind you and stable. It can support later milestones.";
  }
  if (node.status === "in_progress") {
    return "This is the present execution point. Finish it or explicitly mark the blocker before moving ahead.";
  }
  if (index === total - 1) {
    return "This is the far-future checkpoint. Keep it visible, but do not over-plan it until near-term work is stable.";
  }
  return "This is planned work ahead of the present. Pull it forward only when the current checkpoint is stable.";
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
