import { lazy, Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  CheckCircle2,
  CircleDot,
  Gauge,
  Radar,
  ShieldCheck,
  TriangleAlert,
  Waypoints
} from "lucide-react";

import { MetricTile } from "@/components/MetricTile";
import { ProjectOrbitCard } from "@/components/ProjectOrbitCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { createLocalBriefing, downloadTextFile } from "@/lib/localAi";
import type { ExecutionAction, MissionData, RiskSignal } from "@/types/domain";

const GalaxyScene = lazy(() => import("@/scenes/GalaxyScene"));

export function MissionControl({ data }: { data: MissionData }) {
  const briefing = useMemo(() => createLocalBriefing(data), [data]);
  const intelligence = data.executionIntelligence;

  return (
    <div className="relative min-h-[calc(100vh-6rem)]">
      <section className="absolute inset-x-0 top-0 h-[48vh] min-h-[320px] overflow-hidden rounded-lg border border-white/10 bg-void/80 shadow-violet">
        <Suspense fallback={<div className="h-full w-full bg-void" />}>
          <GalaxyScene projects={data.projects} relationships={data.relationships} />
        </Suspense>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_0%,rgba(2,4,10,0.1)_38%,rgba(2,4,10,0.82)_100%)]" />
      </section>

      <div className="relative space-y-4">
        <section className="grid gap-3 pt-[42vh] sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric, index) => (
            <MetricTile key={metric.label} metric={metric} index={index} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">
                  Portfolio systems
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">Active Projects</h2>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {data.projects.length} active
              </span>
            </div>
            {data.projects.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.projects.map((project) => (
                  <ProjectOrbitCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="glass-panel flex min-h-40 items-center justify-center rounded-lg p-6 text-center text-sm text-slate-400">
                Create a project to establish the first portfolio signal.
              </div>
            )}
          </div>

          <ForecastPanel data={data} />
        </section>

        <section className="glass-panel rounded-lg p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <Waypoints size={17} className="text-cyan" />
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">
                  Execution intelligence
                </p>
              </div>
              <h2 className="mt-2 text-xl font-semibold text-white">Next Best Actions</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{intelligence.headline}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-success/25 bg-success/10 px-2.5 font-mono text-[11px] uppercase text-success">
                <ShieldCheck size={13} />
                $0 local engine
              </span>
              <Button
                variant="ghost"
                icon={<ArrowDownToLine size={15} />}
                onClick={() =>
                  downloadTextFile("nexus-local-report.md", briefing.report, "text/markdown")
                }
              >
                Export
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Ranked queue
              </p>
              {intelligence.nextActions.length > 0 ? (
                <ol className="overflow-hidden rounded-md border border-white/10 bg-black/15">
                  {intelligence.nextActions.map((action, index) => (
                    <ExecutionActionRow
                      key={action.taskId ?? action.title + "-" + index}
                      action={action}
                      index={index}
                    />
                  ))}
                </ol>
              ) : (
                <div className="flex min-h-32 items-center gap-3 rounded-md border border-dashed border-white/15 px-4 text-sm text-slate-400">
                  <CheckCircle2 size={19} className="shrink-0 text-success" />
                  No open action is ranked yet. Add a task with a priority or deadline.
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Risk watch
              </p>
              {intelligence.riskSignals.length > 0 ? (
                <div className="divide-y divide-white/10 border-y border-white/10">
                  {intelligence.riskSignals.map((signal) => (
                    <RiskRow key={signal.key} signal={signal} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-32 items-center gap-3 border-y border-white/10 px-1 text-sm text-slate-400">
                  <ShieldCheck size={19} className="shrink-0 text-success" />
                  No deadline breach or blocked path is visible.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <SignalList
            eyebrow="Today's mission"
            title="Focused Queue"
            icon={<Radar size={20} className="text-cyan" />}
            items={data.todayMission}
            numbered
          />
          <SignalList
            eyebrow="Recent signal"
            title="Workspace Activity"
            icon={<CheckCircle2 size={20} className="text-success" />}
            items={data.activity.slice(0, 5)}
          />
        </section>
      </div>
    </div>
  );
}

function ForecastPanel({ data }: { data: MissionData }) {
  const forecast = data.executionIntelligence.forecast;
  const status = forecastStatus(forecast.status);

  return (
    <motion.aside
      className="glass-panel self-start rounded-lg p-4"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-violet">
            Portfolio forecast
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Schedule Confidence</h2>
        </div>
        <Gauge size={22} className={status.iconClass} />
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <strong className={cn("font-mono text-4xl font-semibold tabular-nums", status.textClass)}>
          {forecast.scheduleConfidence}%
        </strong>
        <span className={cn("rounded-md border px-2 py-1 text-xs font-medium", status.badgeClass)}>
          {status.label}
        </span>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Schedule confidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={forecast.scheduleConfidence}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", status.barClass)}
          style={{ width: String(forecast.scheduleConfidence) + "%" }}
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{forecast.summary}</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4">
        <ForecastMetric label="Tracked completion" value={String(forecast.completionPercent) + "%"} />
        <ForecastMetric label="Effort remaining" value={formatMinutes(forecast.remainingMinutes)} />
        <ForecastMetric label="Overdue" value={String(forecast.overdueTasks)} risk={forecast.overdueTasks > 0} />
        <ForecastMetric label="Blocked paths" value={String(forecast.blockedTasks)} risk={forecast.blockedTasks > 0} />
      </dl>
    </motion.aside>
  );
}

function ExecutionActionRow({
  action,
  index
}: {
  action: ExecutionAction;
  index: number;
}) {
  const isRecovery =
    action.actionType === "unblock" || action.actionType === "recover_deadline";

  return (
    <motion.li
      className="grid gap-3 border-b border-white/10 p-3 last:border-b-0 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-start sm:p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md border font-mono text-xs",
          isRecovery
            ? "border-risk/30 bg-risk/10 text-risk"
            : "border-cyan/30 bg-cyan/10 text-cyan"
        )}
      >
        {index + 1}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-medium text-white">{action.title}</h3>
          <span className="text-xs text-slate-500">{action.projectName}</span>
        </div>
        <p className="mt-1.5 text-sm leading-5 text-slate-300">{action.reason}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] uppercase text-slate-500">
          <span>{action.priority} priority</span>
          {action.dueDate ? <span>Due {formatDueDate(action.dueDate)}</span> : null}
          {action.dependencyCount > 0 ? (
            <span>{action.dependencyCount} dependency</span>
          ) : null}
        </div>
      </div>
      <span className="self-start font-mono text-xs tabular-nums text-slate-400">
        {Math.round(action.confidence * 100)}% confidence
      </span>
    </motion.li>
  );
}

function RiskRow({ signal }: { signal: RiskSignal }) {
  const tone =
    signal.severity === "critical"
      ? "text-risk"
      : signal.severity === "high"
        ? "text-solar"
        : "text-cyan";

  return (
    <div className="flex gap-3 py-3">
      <TriangleAlert size={17} className={cn("mt-0.5 shrink-0", tone)} />
      <div>
        <h3 className="text-sm font-medium text-white">{signal.title}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-400">{signal.detail}</p>
      </div>
    </div>
  );
}

function SignalList({
  eyebrow,
  title,
  icon,
  items,
  numbered = false
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  items: string[];
  numbered?: boolean;
}) {
  return (
    <section className="glass-panel rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
        </div>
        {icon}
      </div>
      <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={item + "-" + index} className="flex min-h-12 items-center gap-3 py-2.5 text-sm text-slate-300">
              {numbered ? (
                <span className="font-mono text-xs text-cyan">{String(index + 1).padStart(2, "0")}</span>
              ) : (
                <CircleDot size={14} className="shrink-0 text-success" />
              )}
              <span>{item}</span>
            </div>
          ))
        ) : (
          <p className="py-4 text-sm text-slate-500">No workspace activity recorded yet.</p>
        )}
      </div>
    </section>
  );
}

function ForecastMetric({
  label,
  value,
  risk = false
}: {
  label: string;
  value: string;
  risk?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={cn("mt-1 font-mono text-sm tabular-nums text-slate-200", risk && "text-risk")}>
        {value}
      </dd>
    </div>
  );
}

function forecastStatus(status: MissionData["executionIntelligence"]["forecast"]["status"]) {
  if (status === "at_risk") {
    return {
      label: "At risk",
      textClass: "text-risk",
      iconClass: "text-risk",
      badgeClass: "border-risk/30 bg-risk/10 text-risk",
      barClass: "bg-risk"
    };
  }
  if (status === "watch") {
    return {
      label: "Watch",
      textClass: "text-solar",
      iconClass: "text-solar",
      badgeClass: "border-solar/30 bg-solar/10 text-solar",
      barClass: "bg-solar"
    };
  }
  if (status === "empty") {
    return {
      label: "Awaiting data",
      textClass: "text-slate-300",
      iconClass: "text-slate-400",
      badgeClass: "border-white/10 bg-white/[0.04] text-slate-300",
      barClass: "bg-slate-500"
    };
  }
  return {
    label: "On track",
    textClass: "text-success",
    iconClass: "text-success",
    badgeClass: "border-success/30 bg-success/10 text-success",
    barClass: "bg-success"
  };
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return String(minutes) + "m";
  return (minutes / 60).toFixed(1) + "h";
}

function formatDueDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "unscheduled";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(parsed);
}
