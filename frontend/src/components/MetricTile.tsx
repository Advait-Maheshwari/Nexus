import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { Metric } from "@/types/domain";

const toneClass: Record<Metric["tone"], string> = {
  cyan: "text-cyan",
  green: "text-success",
  gold: "text-solar",
  red: "text-risk",
  violet: "text-violet"
};

export function MetricTile({ metric, index }: { metric: Metric; index: number }) {
  return (
    <motion.article
      className="glass-panel min-w-0 rounded-lg p-3 sm:p-4"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.28, ease: "easeOut" }}
    >
      <p className="truncate text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:text-xs sm:tracking-[0.22em]">{metric.label}</p>
      <div className="mt-3 flex min-w-0 flex-wrap items-end justify-between gap-2">
        <strong className={cn("min-w-0 text-2xl font-semibold sm:text-3xl", toneClass[metric.tone])}>
          {metric.value}
        </strong>
        <span className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] text-slate-300 sm:text-xs">
          {metric.delta}
        </span>
      </div>
    </motion.article>
  );
}

