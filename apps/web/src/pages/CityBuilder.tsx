import { lazy, Suspense, useState } from "react";
import { Building2, Clock3, ShieldAlert, Zap } from "lucide-react";

import { StatusPill } from "@/components/StatusPill";
import type { MissionData } from "@/types/domain";

const CityScene = lazy(() => import("@/scenes/CityScene"));

export function CityBuilderView({ data }: { data: MissionData }) {
  const [selectedId, setSelectedId] = useState(data.projects[0]?.id ?? "");
  const selected = data.projects.find((project) => project.id === selectedId);

  return (
    <section className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[1fr_340px]">
      <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-white/10 bg-void">
        <Suspense fallback={<div className="h-full bg-void" />}>
          <CityScene
            projects={data.projects}
            selectedProjectId={selectedId}
            onSelectProject={setSelectedId}
          />
        </Suspense>
        <div className="pointer-events-none absolute left-4 top-4">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-solar">City Builder</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Portfolio Metropolis</h2>
        </div>
      </div>

      {selected ? (
        <aside className="space-y-3">
          <section className="glass-panel rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">
                  District {selected.codename}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{selected.name}</h3>
              </div>
              <StatusPill status={selected.status} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <CityMetric icon={<Building2 size={16} />} label="Towers" value={selected.featureCount} />
              <CityMetric icon={<Zap size={16} />} label="Power" value={`${selected.progress}%`} />
              <CityMetric
                icon={<ShieldAlert size={16} />}
                label="Damage"
                value={selected.blockedTaskCount}
              />
              <CityMetric
                icon={<Clock3 size={16} />}
                label="Hours"
                value={Math.round(selected.timeSpentMinutes / 60)}
              />
            </div>
          </section>
          <section className="glass-panel rounded-lg p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-violet">City Logic</p>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              <CityLegend color={selected.accent} text="Completed feature tower" />
              <CityLegend color="#263244" text="Planned construction" />
              <CityLegend color="#fb7185" text="Blocked work beacon" />
            </div>
          </section>
        </aside>
      ) : null}
    </section>
  );
}

function CityMetric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <span className="text-cyan">{icon}</span>
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function CityLegend({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
      {text}
    </div>
  );
}
