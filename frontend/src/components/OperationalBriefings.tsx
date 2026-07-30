import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, FileClock, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  fetchOperations,
  generateBriefingSnapshot
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { NexusSession } from "@/types/auth";
import type {
  BriefingSnapshot,
  BriefingType,
  OperationsOverview
} from "@/types/operations";

export function OperationalBriefings({
  session,
  embedded = false
}: {
  session: NexusSession;
  embedded?: boolean;
}) {
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [busyType, setBusyType] = useState<BriefingType | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setOverview(await fetchOperations(session.accessToken));
  }, [session.accessToken]);

  useEffect(() => {
    let active = true;
    void fetchOperations(session.accessToken)
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((error) => {
        if (active) {
          setStatus(error instanceof Error ? error.message : "Briefing history failed to load.");
        }
      });
    return () => {
      active = false;
    };
  }, [session.accessToken]);

  const latestByType = useMemo(() => {
    const snapshots = overview?.snapshots ?? [];
    return {
      daily: snapshots.find((snapshot) => snapshot.briefingType === "daily"),
      weekly: snapshots.find((snapshot) => snapshot.briefingType === "weekly")
    };
  }, [overview]);

  async function capture(type: BriefingType) {
    setBusyType(type);
    setStatus("");
    try {
      await generateBriefingSnapshot(
        session.accessToken,
        type,
        Boolean(latestByType[type])
      );
      await load();
      setStatus(`${type === "daily" ? "Daily briefing" : "Weekly review"} saved.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Briefing generation failed.");
    } finally {
      setBusyType(null);
    }
  }

  const canWrite = session.role !== "viewer";

  return (
    <section className={cn(!embedded && "glass-panel rounded-lg p-4 sm:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-cyan">
            <FileClock size={18} />
            <p className="font-mono text-xs uppercase tracking-[0.2em]">Briefing archive</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">Operational Reviews</h2>
          <p className="mt-2 text-sm text-slate-400">
            {overview?.snapshots.length ?? 0} server-owned snapshots in this workspace
          </p>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button
              icon={
                latestByType.daily ? (
                  <RefreshCw size={15} />
                ) : (
                  <Sparkles size={15} />
                )
              }
              disabled={busyType !== null}
              onClick={() => void capture("daily")}
            >
              {latestByType.daily ? "Refresh Daily" : "Capture Daily"}
            </Button>
            <Button
              icon={<CalendarClock size={15} />}
              disabled={busyType !== null}
              onClick={() => void capture("weekly")}
            >
              {latestByType.weekly ? "Refresh Weekly" : "Capture Weekly"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <LatestBriefing snapshot={latestByType.daily ?? latestByType.weekly} />
        <div className="min-w-0 border-t border-white/10 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Recent periods
          </p>
          {(overview?.snapshots.length ?? 0) > 0 ? (
            <div className="mt-2 divide-y divide-white/10">
              {overview?.snapshots.slice(0, 5).map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex min-w-0 items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {snapshot.briefingType === "daily" ? "Daily briefing" : "Weekly review"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase text-slate-500">
                      {snapshot.periodKey}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[10px] uppercase",
                      snapshot.content.riskCount
                        ? "border-solar/25 bg-solar/10 text-solar"
                        : "border-success/25 bg-success/10 text-success"
                    )}
                  >
                    {snapshot.content.riskCount} risks
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-400">
              No operational review has been saved for this workspace.
            </p>
          )}
        </div>
      </div>
      {status ? (
        <p role="status" className="mt-4 text-sm text-slate-400">
          {status}
        </p>
      ) : null}
    </section>
  );
}

function LatestBriefing({ snapshot }: { snapshot?: BriefingSnapshot }) {
  if (!snapshot) {
    return (
      <div className="flex min-h-40 items-center border-y border-dashed border-white/15 text-sm text-slate-400">
        The first captured briefing will establish the workspace review history.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-cyan/25 bg-cyan/10 px-2 py-1 font-mono text-[10px] uppercase text-cyan">
          {snapshot.briefingType}
        </span>
        <span className="font-mono text-[11px] uppercase text-slate-500">
          {snapshot.periodKey}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-7 text-white">
        {snapshot.content.headline}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{snapshot.content.focus}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <BriefingMetric label="Projects" value={snapshot.content.projectCount} />
        <BriefingMetric label="Risks" value={snapshot.content.riskCount} />
        <BriefingMetric label="Blocked" value={snapshot.content.blockedTaskCount} />
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        Next task
      </p>
      <p className="mt-2 break-words text-sm font-medium text-cyan">
        {snapshot.content.nextTask}
      </p>
    </div>
  );
}

function BriefingMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l border-white/10 pl-3">
      <p className="font-mono text-lg text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
