import { lazy, Suspense, useState } from "react";
import { Building2, Clock3, Factory, RadioTower, ShieldAlert, Zap } from "lucide-react";

import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/utils";
import type { MissionData } from "@/types/domain";

const CityScene = lazy(() => import("@/scenes/CityScene"));

export function CityBuilderView({ data }: { data: MissionData }) {
  const [selectedId, setSelectedId] = useState(data.projects[0]?.id ?? "");
  const selected = data.projects.find((project) => project.id === selectedId);

  return (
    <section className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[280px_minmax(0,1fr)_330px]">
      <aside className="glass-panel rounded-lg p-3">
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-solar">
              City Builder
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Project Cities</h2>
          </div>
          <Factory className="text-solar" size={22} />
        </div>

        <div className="mt-3 space-y-2">
          {data.projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedId(project.id)}
              className={cn(
                "w-full rounded-md border p-3 text-left transition",
                selectedId === project.id
                  ? "border-solar/45 bg-solar/10 shadow-glow"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
                  {project.codename}
                </span>
                <StatusPill health={project.health} />
              </div>
              <strong className="mt-2 block text-sm text-white">{project.name}</strong>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniCityMetric label="Power" value={`${project.progress}%`} />
                <MiniCityMetric label="Towers" value={project.featureCount} />
                <MiniCityMetric label="Alerts" value={project.blockedTaskCount} />
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-white/10 bg-void">
        {selected ? (
          <Suspense fallback={<div className="h-full bg-void" />}>
            <CityScene project={selected} />
          </Suspense>
        ) : null}
        <div className="pointer-events-none absolute left-4 top-4">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-solar">City Builder</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            {selected ? `${selected.name} City` : "Project City"}
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Features become districts. Tasks become towers. Blockers become visible damage.
          </p>
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/10 bg-void/80 px-3 py-2 backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Navigation
          </p>
          <p className="mt-1 text-xs text-slate-300">Drag to orbit / scroll to zoom / select project left</p>
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
              <CityMetric icon={<RadioTower size={16} />} label="Districts" value={selected.planets.length} />
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
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">
              Districts
            </p>
            <div className="mt-3 space-y-2">
              {selected.planets.map((feature) => (
                <div
                  key={feature.id}
                  className="rounded-md border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{feature.name}</span>
                    <span className="font-mono text-xs text-cyan">{feature.progress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-solar to-cyan"
                      style={{ width: `${feature.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="glass-panel rounded-lg p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-violet">City Logic</p>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              <CityLegend color={selected.accent} text="Completed work raises neon towers" />
              <CityLegend color="#52617a" text="Planned work stays low and dim" />
              <CityLegend color="#fb7185" text="Blocked work creates damage beacons" />
              <CityLegend color="#7dd3fc" text="Windows show active task energy" />
            </div>
          </section>
        </aside>
      ) : null}
    </section>
  );
}

function MiniCityMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-white">{value}</p>
    </div>
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
