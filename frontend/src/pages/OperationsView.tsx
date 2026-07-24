import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Eye,
  Play,
  Plus,
  ShieldCheck,
  Trash2,
  Workflow
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  createAutomationRule,
  deleteAutomationRule,
  executeAutomationRule,
  fetchOperations,
  previewAutomationRule,
  updateAutomationRule
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { NexusSession } from "@/types/auth";
import type {
  AutomationPreview,
  BriefingType,
  OperationsOverview
} from "@/types/operations";

export function OperationsView({ session }: { session: NexusSession }) {
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [previews, setPreviews] = useState<Record<string, AutomationPreview>>({});
  const [busy, setBusy] = useState("");
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
          setStatus(error instanceof Error ? error.message : "Automation controls failed to load.");
        }
      });
    return () => {
      active = false;
    };
  }, [session.accessToken]);

  const canManage = session.role === "owner" || session.role === "admin";

  async function addRule(type: BriefingType) {
    setBusy(`create-${type}`);
    setStatus("");
    try {
      await createAutomationRule(session.accessToken, {
        name: type === "daily" ? "Daily mission briefing" : "Weekly command review",
        briefingType: type
      });
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Automation rule creation failed.");
    } finally {
      setBusy("");
    }
  }

  async function toggleRule(ruleId: string, enabled: boolean) {
    setBusy(ruleId);
    setStatus("");
    try {
      await updateAutomationRule(session.accessToken, ruleId, { enabled });
      setPreviews((current) => {
        const next = { ...current };
        delete next[ruleId];
        return next;
      });
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Automation rule update failed.");
    } finally {
      setBusy("");
    }
  }

  async function preview(ruleId: string) {
    setBusy(ruleId);
    setStatus("");
    try {
      const result = await previewAutomationRule(session.accessToken, ruleId);
      setPreviews((current) => ({ ...current, [ruleId]: result }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Automation preview failed.");
    } finally {
      setBusy("");
    }
  }

  async function removeRule(ruleId: string) {
    setBusy(ruleId);
    setStatus("");
    try {
      await deleteAutomationRule(session.accessToken, ruleId);
      setPreviews((current) => {
        const next = { ...current };
        delete next[ruleId];
        return next;
      });
      await load();
      setStatus("Automation rule and its run receipts were removed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Automation rule deletion failed.");
    } finally {
      setBusy("");
    }
  }

  async function execute(ruleId: string) {
    setBusy(ruleId);
    setStatus("");
    try {
      const run = await executeAutomationRule(session.accessToken, ruleId);
      setPreviews((current) => {
        const next = { ...current };
        delete next[ruleId];
        return next;
      });
      await load();
      setStatus(
        run.status === "completed"
          ? "Approved automation completed and its receipt was saved."
          : "Automation was safely skipped because the period already had a snapshot."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Automation execution failed.");
    } finally {
      setBusy("");
    }
  }

  const hasDaily = overview?.rules.some((rule) => rule.briefingType === "daily");
  const hasWeekly = overview?.rules.some((rule) => rule.briefingType === "weekly");

  return (
    <section className="min-w-0 space-y-4">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Operations</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Automation Control</h2>
        <p className="mt-2 text-sm text-slate-400">
          {overview?.rules.length ?? 0} rules · {overview?.recentRuns.length ?? 0} audit receipts
        </p>
      </header>

      <section className="glass-panel rounded-lg p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Workflow size={18} className="text-cyan" />
            <h3 className="text-lg font-semibold text-white">Briefing Rules</h3>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {!hasDaily ? (
                <Button
                  icon={<Plus size={15} />}
                  disabled={Boolean(busy)}
                  onClick={() => void addRule("daily")}
                >
                  Daily Rule
                </Button>
              ) : null}
              {!hasWeekly ? (
                <Button
                  icon={<Plus size={15} />}
                  disabled={Boolean(busy)}
                  onClick={() => void addRule("weekly")}
                >
                  Weekly Rule
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {(overview?.rules.length ?? 0) > 0 ? (
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {overview?.rules.map((rule) => {
              const rulePreview = previews[rule.id];
              return (
                <div key={rule.id} className="py-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.75fr)_minmax(280px,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{rule.name}</p>
                        <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-400">
                          {rule.cadence}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Limit {rule.maxRunsPerPeriod} run per period
                      </p>
                    </div>
                    <label className="flex min-h-10 items-center gap-3 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={rule.enabled}
                        disabled={!canManage || Boolean(busy)}
                        onChange={(event) => void toggleRule(rule.id, event.target.checked)}
                        className="h-4 w-4 accent-cyan"
                      />
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </label>
                    {canManage ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          icon={<Eye size={15} />}
                          disabled={Boolean(busy)}
                          onClick={() => void preview(rule.id)}
                        >
                          Preview
                        </Button>
                        <Button
                          variant="ghost"
                          icon={<Trash2 size={15} />}
                          aria-label={`Delete ${rule.name}`}
                          title={`Delete ${rule.name}`}
                          disabled={Boolean(busy)}
                          className="px-2 text-danger hover:bg-danger/10 hover:text-danger"
                          onClick={() => void removeRule(rule.id)}
                        />
                      </div>
                    ) : null}
                  </div>
                  {rulePreview ? (
                    <div className="mt-4 border-l-2 border-cyan/30 pl-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-3xl">
                          <p className="text-sm font-medium text-white">
                            {rulePreview.actionSummary}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {rulePreview.reason}
                          </p>
                          <p className="mt-2 font-mono text-[11px] uppercase text-slate-500">
                            Period {rulePreview.periodKey} · project data unchanged
                          </p>
                        </div>
                        {rulePreview.due ? (
                          <Button
                            variant="primary"
                            icon={<Play size={15} />}
                            disabled={Boolean(busy)}
                            onClick={() => void execute(rule.id)}
                          >
                            Approve Run
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 border-y border-dashed border-white/15 py-6 text-sm text-slate-400">
            No automation rules are configured in this workspace.
          </p>
        )}
      </section>

      <section className="glass-panel rounded-lg p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-violet" />
          <h3 className="text-lg font-semibold text-white">Run Receipts</h3>
        </div>
        {(overview?.recentRuns.length ?? 0) > 0 ? (
          <div className="mt-4 divide-y divide-white/10">
            {overview?.recentRuns.slice(0, 8).map((run) => (
              <div
                key={run.id}
                className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CheckCircle2 size={16} className="shrink-0 text-success" />
                  <div className="min-w-0">
                    <p className="text-sm text-white">
                      {run.status === "completed" ? "Snapshot generated" : "Safely skipped"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase text-slate-500">
                      {run.periodKey} · {formatTimestamp(run.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[10px] uppercase text-slate-500">
                  confirmed
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No automation has been approved yet.</p>
        )}
      </section>

      <section className="glass-panel rounded-lg p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-success" />
          <h3 className="text-lg font-semibold text-white">AI Provider Boundary</h3>
        </div>
        <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {overview?.providers.map((provider) => (
            <div
              key={provider.provider}
              className="grid gap-2 py-3 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-center"
            >
              <p className="text-sm font-medium text-white">{provider.label}</p>
              <p className="text-sm leading-5 text-slate-400">{provider.detail}</p>
              <span
                className={cn(
                  "w-fit rounded-md border px-2 py-1 font-mono text-[10px] uppercase",
                  provider.enabled
                    ? "border-success/25 bg-success/10 text-success"
                    : "border-white/10 bg-white/[0.04] text-slate-500"
                )}
              >
                {provider.enabled ? "Active" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {status ? (
        <p role="status" className="text-sm text-slate-400">
          {status}
        </p>
      ) : null}
    </section>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
