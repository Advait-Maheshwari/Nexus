import { lazy, Suspense, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ArrowUpRight, BrainCircuit, CheckCircle2, CircleDot, Radar } from "lucide-react";

import { MetricTile } from "@/components/MetricTile";
import { ProjectOrbitCard } from "@/components/ProjectOrbitCard";
import { Button } from "@/components/ui/Button";
import type { MissionData } from "@/types/domain";

const GalaxyScene = lazy(() => import("@/scenes/GalaxyScene"));

export function MissionControl({ data }: { data: MissionData }) {
  const commandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!commandRef.current) {
      return;
    }

    gsap.fromTo(
      commandRef.current.querySelectorAll("[data-command-item]"),
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.68, stagger: 0.08, ease: "power3.out" }
    );
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-6rem)]">
      <section className="absolute inset-x-0 top-0 h-[56vh] min-h-[360px] overflow-hidden rounded-lg border border-white/10 bg-void/80 shadow-violet">
        <Suspense fallback={<div className="h-full w-full bg-void" />}>
          <GalaxyScene projects={data.projects} relationships={data.relationships} />
        </Suspense>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_0%,rgba(2,4,10,0.1)_38%,rgba(2,4,10,0.82)_100%)]" />
      </section>

      <section className="relative grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="grid gap-3 pt-[42vh] sm:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((metric, index) => (
              <MetricTile key={metric.label} metric={metric} index={index} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid gap-3 md:grid-cols-2">
              {data.projects.map((project) => (
                <ProjectOrbitCard key={project.id} project={project} />
              ))}
            </div>

            <motion.aside
              className="glass-panel rounded-lg p-4"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-violet">
                    Today
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Mission Stack</h2>
                </div>
                <Radar className="text-cyan" size={22} />
              </div>
              <div className="mt-4 space-y-3">
                {data.todayMission.map((mission, index) => (
                  <div
                    key={mission}
                    className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan/35 bg-cyan/10 text-xs text-cyan">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-slate-200">{mission}</p>
                  </div>
                ))}
              </div>
            </motion.aside>
          </div>
        </div>

        <div ref={commandRef} className="space-y-4 xl:pt-[42vh]">
          <section className="glass-panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">AI</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Briefing</h2>
              </div>
              <BrainCircuit className="text-cyan" size={23} />
            </div>

            <div className="mt-4 space-y-3">
              {data.aiRecommendations.map((recommendation) => (
                <article
                  key={recommendation.title}
                  data-command-item
                  className="rounded-md border border-white/10 bg-white/[0.045] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{recommendation.title}</h3>
                    <span className="font-mono text-xs text-cyan">
                      {Math.round(recommendation.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{recommendation.body}</p>
                  <Button
                    className="mt-3 w-full justify-between"
                    icon={<ArrowUpRight size={15} />}
                    variant="ghost"
                  >
                    {recommendation.actionLabel}
                  </Button>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-solar">
                  Activity
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">Recent Signal</h2>
              </div>
              <CircleDot className="text-solar" size={21} />
            </div>
            <div className="mt-4 space-y-3">
              {data.activity.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="shrink-0 text-success" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
