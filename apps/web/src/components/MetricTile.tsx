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
      className="glass-panel scanline rounded-lg p-4"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.5, ease: "easeOut" }}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{metric.label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <strong className={cn("text-3xl font-semibold", toneClass[metric.tone])}>
          {metric.value}
        </strong>
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-slate-300">
          {metric.delta}
        </span>
      </div>
    </motion.article>
  );
}

