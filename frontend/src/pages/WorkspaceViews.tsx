import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Clock3,
  Factory,
  Gauge,
  Lightbulb,
  NotebookPen,
  Orbit,
  RotateCcw,
  Settings,
  ShieldCheck,
  Target,
  Timer,
  TrendingUp,
  UserCircle,
  Zap
} from "lucide-react";

import { ProjectOrbitCard } from "@/components/ProjectOrbitCard";
import { StatusPill } from "@/components/StatusPill";
import type { MissionData, ProjectSummary } from "@/types/domain";

const GalaxyScene = lazy(() => import("@/scenes/GalaxyScene"));

export function GalaxyView({ data }: { data: MissionData }) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedPlanetId, setSelectedPlanetId] = useState("");
  const [sceneRevision, setSceneRevision] = useState(0);
  const selectedProject = data.projects.find((project) => project.id === selectedProjectId);
  const selectedPlanet = selectedProject?.planets.find(
    (planet) => planet.id === selectedPlanetId
  );

  useEffect(() => {
    if (data.projects.length !== 1 || selectedProjectId) return;

    const [project] = data.projects;
    setSelectedProjectId(project.id);
    setSelectedPlanetId(project.planets[0]?.id ?? "");
  }, [data.projects, selectedProjectId]);

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
    <section className="grid min-h-[calc(100vh-8rem)] min-w-0 w-full gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="relative min-h-[520px] min-w-0 w-full overflow-hidden rounded-lg border border-white/10 bg-void xl:h-[calc(100vh-8rem)] xl:min-h-[620px] xl:max-h-[820px] xl:self-start">
        <Suspense fallback={<div className="h-full w-full bg-void" />}>
          <GalaxyScene
            projects={data.projects}
            relationships={data.relationships}
            selectedProjectId={selectedProjectId}
            selectedPlanetId={selectedPlanetId}
            resetSignal={sceneRevision}
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
        {data.projects.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <Orbit className="mx-auto text-cyan" size={28} />
              <p className="mt-3 text-sm font-semibold text-white">No project systems yet</p>
              <p className="mt-1 text-xs text-slate-400">Create a project to form its first star.</p>
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/10 bg-void/80 px-3 py-2 backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Navigation
          </p>
          <p className="mt-1 text-xs text-slate-300">Select a star / drag to orbit / scroll to zoom</p>
        </div>
        <button
          type="button"
          title="Fit all project systems"
          aria-label="Reset galaxy camera"
          onClick={() => {
            setSelectedProjectId("");
            setSelectedPlanetId("");
            setSceneRevision((revision) => revision + 1);
          }}
          className="absolute bottom-4 right-4 grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-void/80 text-slate-300 backdrop-blur-md transition hover:border-cyan/35 hover:text-cyan"
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <div className="min-w-0 space-y-3">
        {selectedProject ? (
          <>
            <ProjectOrbitCard project={selectedProject} />
            <section className="glass-panel rounded-lg p-4">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">
                System Meaning
              </p>
              <div className="mt-3 grid gap-2">
                <GalaxyLegend color={selectedProject.accent} label="Star" text="Selected project and its overall health." />
                <GalaxyLegend color="#8d67ff" label="Planets" text="Project features, sized by completion and colored by status." />
                <GalaxyLegend color="#4ade80" label="Moons" text="Tasks around each feature: green done, gray open, red blocked." />
                <GalaxyLegend color="#f5c451" label="Links" text="Dependencies, shared AI, deadlines, and inspiration between projects." />
              </div>
            </section>
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
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Feature planet with {planet.taskCount} task moon{planet.taskCount === 1 ? "" : "s"}.
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
                        style={{ width: `${planet.progress}%` }}
                      />
                    </div>
                  </button>
                ))}
                {selectedProject.planets.length === 0 ? (
                  <div className="rounded-md border border-dashed border-cyan/25 bg-cyan/[0.04] p-3">
                    <p className="text-sm font-semibold text-white">First planet is ready to form</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Add a feature to this project. Nexus will turn it into a planet and its tasks into moons.
                    </p>
                  </div>
                ) : null}
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
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Moons are tasks. Red moons are blocked tasks. Stable green moons represent completed work.
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

function GalaxyLegend({ color, label, text }: { color: string; label: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">{text}</span>
      </span>
    </div>
  );
}

export function AnalyticsView({ data }: { data: MissionData }) {
  const portfolio = useMemo(() => buildPortfolioAnalytics(data.projects), [data.projects]);
  const focusProject = portfolio.riskQueue[0] ?? portfolio.velocityLeaders[0] ?? data.projects[0];

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="glass-panel rounded-lg p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">
                Portfolio Analytics
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Project Command Dashboard</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Progress, risk, time, blockers, and feature health are combined into one operating view.
              </p>
            </div>
            <div className="rounded-md border border-cyan/20 bg-cyan/10 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">Recommended Focus</p>
              <p className="mt-2 text-sm font-semibold text-white">{focusProject?.name ?? "No projects"}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {focusProject ? focusReason(focusProject) : "Create a project to begin analytics."}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsMetric icon={<Gauge size={18} />} label="Avg Health" value={portfolio.averageHealth} suffix="/100" tone="green" />
            <AnalyticsMetric icon={<Target size={18} />} label="Avg Progress" value={portfolio.averageProgress} suffix="%" tone="cyan" />
            <AnalyticsMetric icon={<AlertTriangle size={18} />} label="Blocked Tasks" value={portfolio.blockedTasks} tone="red" />
            <AnalyticsMetric icon={<Timer size={18} />} label="Focus Hours" value={portfolio.totalHours} suffix="h" tone="gold" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Portfolio Pulse</p>
                <Activity className="text-cyan" size={18} />
              </div>
              <div className="mt-4 space-y-4">
                <Bar label="Completion" value={portfolio.averageProgress} color="#48e5ff" />
                <Bar label="Health" value={portfolio.averageHealth} color="#4ade80" />
                <Bar label="Velocity" value={Math.min(100, portfolio.totalVelocity * 8)} color="#f5c451" />
                <Bar label="Risk Load" value={portfolio.riskLoad} color="#fb7185" />
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-risk">Risk Radar</p>
                <ShieldCheck className="text-risk" size={18} />
              </div>
              <div className="mt-4 space-y-2">
                {portfolio.riskQueue.slice(0, 4).map((project) => (
                  <RiskRow key={project.id} project={project} />
                ))}
              </div>
            </section>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="glass-panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-solar">Velocity Leaders</p>
              <TrendingUp className="text-solar" size={18} />
            </div>
            <div className="mt-4 space-y-3">
              {portfolio.velocityLeaders.map((project) => (
                <div key={project.id} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{project.name}</span>
                    <span className="font-mono text-xs text-solar">{project.velocity.toFixed(1)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{project.codename} velocity index</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Time Allocation</p>
              <Clock3 className="text-cyan" size={18} />
            </div>
            <div className="mt-4 space-y-3">
              {data.projects.map((project) => (
                <AllocationRow
                  key={project.id}
                  project={project}
                  totalMinutes={portfolio.totalMinutes}
                />
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="glass-panel rounded-lg p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Project Comparison</p>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">
              <span>Project</span>
              <span>Health</span>
              <span>Progress</span>
              <span>Blocked</span>
              <span>Deadline</span>
            </div>
            {data.projects.map((project) => (
              <ProjectComparisonRow key={project.id} project={project} />
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-lg p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-violet">Feature Heatmap</p>
          <div className="mt-4 space-y-4">
            {data.projects.map((project) => (
              <FeatureHeatmap key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

function buildPortfolioAnalytics(projects: ProjectSummary[]) {
  const totalProgress = projects.reduce((sum, project) => sum + project.progress, 0);
  const totalHealth = projects.reduce((sum, project) => sum + project.healthScore, 0);
  const totalMinutes = projects.reduce((sum, project) => sum + project.timeSpentMinutes, 0);
  const blockedTasks = projects.reduce((sum, project) => sum + project.blockedTaskCount, 0);
  const totalVelocity = projects.reduce((sum, project) => sum + project.velocity, 0);
  const projectCount = Math.max(1, projects.length);
  const riskQueue = [...projects].sort((first, second) => riskScore(second) - riskScore(first));
  const velocityLeaders = [...projects].sort((first, second) => second.velocity - first.velocity).slice(0, 3);

  return {
    averageProgress: Math.round(totalProgress / projectCount),
    averageHealth: Math.round(totalHealth / projectCount),
    blockedTasks,
    riskLoad: Math.min(100, Math.round((blockedTasks / Math.max(1, projects.reduce((sum, project) => sum + project.taskCount, 0))) * 240)),
    riskQueue,
    totalHours: Math.round(totalMinutes / 60),
    totalMinutes,
    totalVelocity,
    velocityLeaders
  };
}

function riskScore(project: ProjectSummary) {
  const blockedWeight = project.blockedTaskCount * 18;
  const healthWeight = Math.max(0, 90 - project.healthScore);
  const progressWeight = project.progress < 35 ? 18 : project.progress < 55 ? 8 : 0;
  const priorityWeight = project.priority === "critical" ? 18 : project.priority === "high" ? 10 : 4;
  return blockedWeight + healthWeight + progressWeight + priorityWeight;
}

function focusReason(project: ProjectSummary) {
  if (project.blockedTaskCount > 0) return `Clear ${project.blockedTaskCount} blocker${project.blockedTaskCount > 1 ? "s" : ""} before expanding scope.`;
  if (project.healthScore < 70) return "Health is below the safe operating range.";
  if (project.progress < 35) return "Progress is still early; define the next concrete delivery unit.";
  return "Highest leverage project based on current velocity and priority.";
}

function AnalyticsMetric({
  icon,
  label,
  value,
  suffix = "",
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  tone: "cyan" | "green" | "gold" | "red";
}) {
  const colorClass = {
    cyan: "text-cyan",
    green: "text-success",
    gold: "text-solar",
    red: "text-risk"
  }[tone];

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <span className={colorClass}>{icon}</span>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">
        {value}
        <span className="text-sm text-slate-500">{suffix}</span>
      </p>
    </div>
  );
}

function RiskRow({ project }: { project: ProjectSummary }) {
  const score = Math.min(100, riskScore(project));
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">{project.name}</span>
        <span className="font-mono text-xs text-risk">{score}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-risk" style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{focusReason(project)}</p>
    </div>
  );
}

function AllocationRow({ project, totalMinutes }: { project: ProjectSummary; totalMinutes: number }) {
  const share = Math.round((project.timeSpentMinutes / Math.max(1, totalMinutes)) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{project.codename}</span>
        <span className="font-mono text-slate-500">{Math.round(project.timeSpentMinutes / 60)}h</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${share}%`, background: project.accent }} />
      </div>
    </div>
  );
}

function ProjectComparisonRow({ project }: { project: ProjectSummary }) {
  return (
    <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-white/5 px-3 py-3 text-sm last:border-b-0">
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{project.name}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{project.codename}</p>
      </div>
      <StatusPill health={project.health} />
      <span className="font-mono text-cyan">{project.progress}%</span>
      <span className={project.blockedTaskCount > 0 ? "font-mono text-risk" : "font-mono text-success"}>
        {project.blockedTaskCount}
      </span>
      <span className="truncate text-slate-400">{project.deadline ?? "Flexible"}</span>
    </div>
  );
}

function FeatureHeatmap({ project }: { project: ProjectSummary }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{project.name}</p>
        <span className="font-mono text-xs text-slate-500">{project.planets.length} features</span>
      </div>
      <div className="mt-3 grid gap-2">
        {project.planets.map((feature) => (
          <div key={feature.id}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-slate-400">{feature.name}</span>
              <span className={feature.blockedTaskCount > 0 ? "font-mono text-risk" : "font-mono text-cyan"}>
                {feature.progress}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${feature.progress}%`,
                  background: feature.blockedTaskCount > 0 ? "#fb7185" : project.accent
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
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
