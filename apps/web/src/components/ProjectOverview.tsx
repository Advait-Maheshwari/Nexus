import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Compass,
  Flag,
  Gauge,
  Pencil,
  Plus,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  X
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useProjectBlueprint } from "@/hooks/useProjectBlueprint";
import type { ProjectBlueprint, ProjectStep } from "@/types/blueprint";
import type { WorkspaceFeature, WorkspaceTask } from "@/types/workspace";

type GuidanceTone = "cyan" | "violet" | "solar" | "risk" | "success";

interface GuidanceAction {
  title: string;
  body: string;
  confidence: number;
  tone: GuidanceTone;
}

interface RiskSignal {
  title: string;
  body: string;
  severity: "low" | "medium" | "high";
}

export function ProjectOverview({
  projectId,
  projectName,
  projectProgress = 0,
  healthScore = 100,
  features = [],
  tasks = []
}: {
  projectId: string;
  projectName: string;
  projectProgress?: number;
  healthScore?: number;
  features?: WorkspaceFeature[];
  tasks?: WorkspaceTask[];
}) {
  const { blueprint, save } = useProjectBlueprint(projectId, projectName);
  const [draft, setDraft] = useState(blueprint);
  const [editing, setEditing] = useState(false);

  const completion = useMemo(() => calculateCompletion(blueprint), [blueprint]);
  const guidance = useMemo(
    () => buildGuidance(blueprint, features, tasks),
    [blueprint, features, tasks]
  );
  const risks = useMemo(
    () => buildRisks(blueprint, features, tasks, projectProgress),
    [blueprint, features, tasks, projectProgress]
  );
  const missionScore = Math.round(completion * 0.45 + projectProgress * 0.35 + healthScore * 0.2);
  const activeStep =
    blueprint.steps.find((step) => step.status === "active") ??
    blueprint.steps.find((step) => step.status === "pending");

  function beginEditing() {
    setDraft(blueprint);
    setEditing(true);
  }

  function saveDraft() {
    save(draft);
    setEditing(false);
  }

  function toggleGoal(goalId: string) {
    save({
      ...blueprint,
      goals: blueprint.goals.map((goal) =>
        goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
      )
    });
  }

  function advanceStep(stepId: string) {
    const order: ProjectStep["status"][] = ["pending", "active", "done"];
    save({
      ...blueprint,
      steps: blueprint.steps.map((step) => {
        if (step.id !== stepId) {
          return step;
        }
        const nextStatus = order[Math.min(order.indexOf(step.status) + 1, order.length - 1)];
        return { ...step, status: nextStatus };
      })
    });
  }

  function removeConstraint(indexToRemove: number) {
    setDraft((current) => ({
      ...current,
      constraints: current.constraints.filter((_, index) => index !== indexToRemove)
    }));
  }

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-solar">
            Project Guidance Engine
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Final Outcome & Next Moves</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Editable project intent, success criteria, movement plan, and zero-cost guardrails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs text-success">
            {missionScore}% ready
          </span>
          {editing ? (
            <>
              <Button
                variant="ghost"
                className="h-10 w-10 px-0"
                icon={<X size={16} />}
                aria-label="Cancel blueprint editing"
                title="Cancel"
                onClick={() => setEditing(false)}
              />
              <Button
                variant="primary"
                className="h-10 w-10 px-0"
                icon={<Save size={16} />}
                aria-label="Save project blueprint"
                title="Save blueprint"
                onClick={saveDraft}
              />
            </>
          ) : (
            <Button
              variant="ghost"
              className="h-10 w-10 px-0"
              icon={<Pencil size={16} />}
              aria-label="Edit project blueprint"
              title="Edit blueprint"
              onClick={beginEditing}
            />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-md border border-cyan/20 bg-cyan/[0.055] p-4">
          <div className="flex items-center gap-2 text-cyan">
            <Compass size={19} />
            <span className="text-xs uppercase tracking-[0.18em]">Recommended Next Move</span>
          </div>
          <h4 className="mt-3 text-lg font-semibold text-white">{guidance[0]?.title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">{guidance[0]?.body}</p>
          {activeStep ? (
            <div className="mt-4 rounded-md border border-white/10 bg-white/[0.045] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Active Phase
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{activeStep.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{activeStep.guidance}</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3">
          <ReadinessMetric
            icon={<Target size={17} />}
            label="Blueprint alignment"
            value={`${completion}%`}
            width={completion}
          />
          <ReadinessMetric
            icon={<Gauge size={17} />}
            label="Project progress"
            value={`${projectProgress}%`}
            width={projectProgress}
          />
          <ReadinessMetric
            icon={<ShieldCheck size={17} />}
            label="Health score"
            value={`${healthScore}`}
            width={healthScore}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <BlueprintText
          icon={<Target size={18} />}
          label="Final Vision"
          value={editing ? draft.vision : blueprint.vision}
          editing={editing}
          onChange={(vision) => setDraft((current) => ({ ...current, vision }))}
        />
        <BlueprintText
          icon={<Flag size={18} />}
          label="Definition of Done"
          value={editing ? draft.definitionOfDone : blueprint.definitionOfDone}
          editing={editing}
          onChange={(definitionOfDone) =>
            setDraft((current) => ({ ...current, definitionOfDone }))
          }
        />
        <BlueprintText
          icon={<Route size={18} />}
          label="Movement Strategy"
          value={editing ? draft.strategy : blueprint.strategy}
          editing={editing}
          onChange={(strategy) => setDraft((current) => ({ ...current, strategy }))}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                Success Goals
              </h4>
              {editing ? (
                <AddButton
                  label="Add goal"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      goals: [
                        ...current.goals,
                        {
                          id: crypto.randomUUID(),
                          title: "New project goal",
                          measure: "Describe how success will be measured.",
                          completed: false
                        }
                      ]
                    }))
                  }
                />
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {(editing ? draft.goals : blueprint.goals).map((goal) => (
                <div
                  key={goal.id}
                  className="min-h-24 rounded-md border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={editing}
                      onClick={() => toggleGoal(goal.id)}
                      className={goal.completed ? "mt-0.5 text-success" : "mt-0.5 text-slate-500"}
                      aria-label={goal.completed ? "Mark goal incomplete" : "Mark goal complete"}
                    >
                      {goal.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      {editing ? (
                        <input
                          value={goal.title}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              goals: current.goals.map((item) =>
                                item.id === goal.id ? { ...item, title: event.target.value } : item
                              )
                            }))
                          }
                          className="w-full bg-transparent text-sm font-semibold text-white outline-none"
                        />
                      ) : (
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            goal.completed ? "text-slate-500 line-through" : "text-white"
                          )}
                        >
                          {goal.title}
                        </p>
                      )}
                      {editing ? (
                        <textarea
                          value={goal.measure}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              goals: current.goals.map((item) =>
                                item.id === goal.id
                                  ? { ...item, measure: event.target.value }
                                  : item
                              )
                            }))
                          }
                          className="mt-2 min-h-16 w-full resize-y rounded-md border border-white/10 bg-navy p-2 text-sm leading-5 text-slate-200 outline-none focus:border-cyan/50"
                        />
                      ) : (
                        <p className="mt-2 text-sm leading-5 text-slate-400">{goal.measure}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                Completion Route
              </h4>
              {editing ? (
                <AddButton
                  label="Add step"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      steps: [
                        ...current.steps,
                        {
                          id: crypto.randomUUID(),
                          title: "New completion step",
                          guidance: "Describe the smallest useful next action.",
                          status: "pending",
                          priority: "medium"
                        }
                      ]
                    }))
                  }
                />
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {(editing ? draft.steps : blueprint.steps).map((step, index) => (
                <div
                  key={step.id}
                  className="grid gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3 md:grid-cols-[36px_minmax(0,1fr)_112px]"
                >
                  <span className="font-mono text-xs text-cyan">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    {editing ? (
                      <input
                        value={step.title}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            steps: current.steps.map((item) =>
                              item.id === step.id ? { ...item, title: event.target.value } : item
                            )
                          }))
                        }
                        className="w-full bg-transparent text-sm font-semibold text-white outline-none"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                    )}
                    {editing ? (
                      <textarea
                        value={step.guidance}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            steps: current.steps.map((item) =>
                              item.id === step.id
                                ? { ...item, guidance: event.target.value }
                                : item
                            )
                          }))
                        }
                        className="mt-2 min-h-16 w-full resize-y rounded-md border border-white/10 bg-navy p-2 text-sm leading-5 text-slate-200 outline-none focus:border-cyan/50"
                      />
                    ) : (
                      <p className="mt-2 text-sm leading-5 text-slate-400">{step.guidance}</p>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2 md:block">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em]",
                        priorityClass(step.priority)
                      )}
                    >
                      {step.priority}
                    </span>
                    {editing ? (
                      <select
                        value={step.status}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            steps: current.steps.map((item) =>
                              item.id === step.id
                                ? {
                                    ...item,
                                    status: event.target.value as ProjectStep["status"]
                                  }
                                : item
                            )
                          }))
                        }
                        className="h-8 rounded-md border border-white/10 bg-navy px-2 text-xs text-white outline-none focus:border-cyan/50 md:mt-3 md:w-full"
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="done">Done</option>
                      </select>
                    ) : (
                      <button
                        type="button"
                        onClick={() => advanceStep(step.id)}
                        disabled={step.status === "done"}
                        className={cn(
                          "rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em] md:mt-3 md:w-full",
                          step.status === "done"
                            ? "border-success/25 bg-success/10 text-success"
                            : step.status === "active"
                              ? "border-cyan/25 bg-cyan/10 text-cyan"
                              : "border-white/10 text-slate-500"
                        )}
                      >
                        {step.status}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-violet">
              <Sparkles size={18} />
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                How To Move
              </h4>
            </div>
            <div className="mt-3 space-y-3">
              {guidance.map((action) => (
                <article key={action.title} className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <h5 className="text-sm font-semibold text-white">{action.title}</h5>
                    <span className={cn("font-mono text-xs", toneTextClass(action.tone))}>
                      {action.confidence}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-400">{action.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-solar">
                <ShieldCheck size={18} />
                <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Guardrails
                </h4>
              </div>
              {editing ? (
                <AddButton
                  label="Add"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      constraints: [...current.constraints, "New project guardrail"]
                    }))
                  }
                />
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {(editing ? draft.constraints : blueprint.constraints).map((constraint, index) => (
                <div
                  key={`${constraint}-${index}`}
                  className="flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.035] p-2"
                >
                  <Check size={15} className="mt-0.5 shrink-0 text-success" />
                  {editing ? (
                    <>
                      <input
                        value={constraint}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            constraints: current.constraints.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item
                            )
                          }))
                        }
                        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeConstraint(index)}
                        className="text-slate-500 transition hover:text-risk"
                        aria-label="Remove guardrail"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <p className="text-sm leading-5 text-slate-300">{constraint}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-risk">
              <AlertTriangle size={18} />
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                Risk Radar
              </h4>
            </div>
            <div className="mt-3 space-y-3">
              {risks.map((risk) => (
                <article key={risk.title} className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <h5 className="text-sm font-semibold text-white">{risk.title}</h5>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase", riskClass(risk.severity))}>
                      {risk.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-400">{risk.body}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function BlueprintText({
  icon,
  label,
  value,
  editing,
  onChange
}: {
  icon: ReactNode;
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-cyan">
        {icon}
        <span className="text-xs uppercase tracking-[0.16em]">{label}</span>
      </div>
      {editing ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-3 min-h-28 w-full resize-y rounded-md border border-white/10 bg-navy p-3 text-sm leading-6 text-white outline-none focus:border-cyan/50"
        />
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-300">{value}</p>
      )}
    </div>
  );
}

function ReadinessMetric({
  icon,
  label,
  value,
  width
}: {
  icon: ReactNode;
  label: string;
  value: string;
  width: number;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-slate-300">
          <span className="text-cyan">{icon}</span>
          {label}
        </span>
        <strong className="font-mono text-sm text-white">{value}</strong>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan via-violet to-solar"
          style={{ width: `${Math.max(0, Math.min(100, width))}%` }}
        />
      </div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-8 px-2 text-xs"
      icon={<Plus size={14} />}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function calculateCompletion(blueprint: ProjectBlueprint): number {
  const total = blueprint.goals.length + blueprint.steps.length;
  if (total === 0) {
    return 0;
  }
  const completedGoals = blueprint.goals.filter((goal) => goal.completed).length;
  const completedSteps = blueprint.steps.filter((step) => step.status === "done").length;
  return Math.round(((completedGoals + completedSteps) / total) * 100);
}

function buildGuidance(
  blueprint: ProjectBlueprint,
  features: WorkspaceFeature[],
  tasks: WorkspaceTask[]
): GuidanceAction[] {
  const blockedTasks = tasks.filter((task) => task.status === "blocked");
  const activeTask = tasks.find((task) => task.status === "in_progress");
  const readyTask = tasks.find((task) => task.status === "ready" || task.status === "backlog");
  const nextStep =
    blueprint.steps.find((step) => step.status === "active") ??
    blueprint.steps.find((step) => step.status === "pending");
  const incompleteGoal = blueprint.goals.find((goal) => !goal.completed);
  const weakestFeature = [...features]
    .filter((feature) => feature.status !== "done")
    .sort((first, second) => first.progress - second.progress)[0];

  const actions: GuidanceAction[] = [];

  if (blockedTasks.length > 0) {
    actions.push({
      title: `Unblock ${blockedTasks[0].title}`,
      body: `There ${blockedTasks.length === 1 ? "is" : "are"} ${blockedTasks.length} blocked task${blockedTasks.length === 1 ? "" : "s"}. Clear this before adding more scope so progress does not look healthier than it is.`,
      confidence: 94,
      tone: "risk"
    });
  }

  if (nextStep) {
    actions.push({
      title: `Advance ${nextStep.title}`,
      body: nextStep.guidance,
      confidence: nextStep.priority === "critical" ? 91 : 84,
      tone: nextStep.priority === "critical" ? "solar" : "cyan"
    });
  }

  if (activeTask) {
    actions.push({
      title: `Finish ${activeTask.title}`,
      body: "A task is already in motion. Close it or move it to a clear blocked state before starting another high-effort item.",
      confidence: 88,
      tone: "success"
    });
  } else if (readyTask) {
    actions.push({
      title: `Start ${readyTask.title}`,
      body: "This is the next available task. Move it into progress and time-box the first working pass.",
      confidence: 79,
      tone: "cyan"
    });
  } else if (tasks.length === 0) {
    actions.push({
      title: "Create the first task slice",
      body: "Turn the project vision into one testable task attached to a feature. Keep it small enough to finish in one focused session.",
      confidence: 82,
      tone: "violet"
    });
  }

  if (incompleteGoal) {
    actions.push({
      title: `Prove ${incompleteGoal.title}`,
      body: incompleteGoal.measure,
      confidence: 76,
      tone: "violet"
    });
  }

  if (weakestFeature) {
    actions.push({
      title: `Strengthen ${weakestFeature.title}`,
      body: `This feature is only ${weakestFeature.progress}% complete. Give it the next concrete task or reduce its scope.`,
      confidence: 72,
      tone: "cyan"
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Run a launch review",
      body: "The plan has no obvious blockers. Validate the workflow, security posture, deployment, and final product vision.",
      confidence: 86,
      tone: "success"
    });
  }

  return actions.slice(0, 4);
}

function buildRisks(
  blueprint: ProjectBlueprint,
  features: WorkspaceFeature[],
  tasks: WorkspaceTask[],
  projectProgress: number
): RiskSignal[] {
  const blockedTasks = tasks.filter((task) => task.status === "blocked");
  const pendingCriticalSteps = blueprint.steps.filter(
    (step) => step.status !== "done" && step.priority === "critical"
  );
  const emptyFeatures = features.length === 0;
  const lowProgressFeatures = features.filter(
    (feature) => feature.status !== "done" && feature.progress < 25
  );
  const risks: RiskSignal[] = [];

  if (blockedTasks.length > 0) {
    risks.push({
      title: "Blocked work",
      body: `${blockedTasks.length} task${blockedTasks.length === 1 ? " is" : "s are"} blocked and should be resolved before expanding scope.`,
      severity: "high"
    });
  }

  if (pendingCriticalSteps.length > 0) {
    risks.push({
      title: "Critical route unfinished",
      body: `${pendingCriticalSteps.length} critical plan step${pendingCriticalSteps.length === 1 ? " is" : "s are"} still open.`,
      severity: "high"
    });
  }

  if (emptyFeatures) {
    risks.push({
      title: "No feature map",
      body: "Create at least one feature so tasks can roll up into project progress.",
      severity: "medium"
    });
  } else if (lowProgressFeatures.length > 0 && projectProgress < 50) {
    risks.push({
      title: "Thin feature progress",
      body: `${lowProgressFeatures.length} feature${lowProgressFeatures.length === 1 ? " is" : "s are"} below 25% while the project is still early.`,
      severity: "medium"
    });
  }

  if (!blueprint.constraints.some((constraint) => constraint.toLowerCase().includes("zero-cost"))) {
    risks.push({
      title: "Cost policy missing",
      body: "Add the zero-cost rule as a guardrail so future integrations do not quietly add paid services.",
      severity: "medium"
    });
  }

  if (risks.length === 0) {
    risks.push({
      title: "No major risk detected",
      body: "Current plan, progress, and task state look healthy. Keep the next move small and verifiable.",
      severity: "low"
    });
  }

  return risks.slice(0, 4);
}

function priorityClass(priority: ProjectStep["priority"]) {
  if (priority === "critical") {
    return "border-risk/25 bg-risk/10 text-risk";
  }
  if (priority === "high") {
    return "border-solar/25 bg-solar/10 text-solar";
  }
  if (priority === "medium") {
    return "border-cyan/25 bg-cyan/10 text-cyan";
  }
  return "border-white/10 bg-white/[0.04] text-slate-400";
}

function riskClass(severity: RiskSignal["severity"]) {
  if (severity === "high") {
    return "border-risk/25 bg-risk/10 text-risk";
  }
  if (severity === "medium") {
    return "border-solar/25 bg-solar/10 text-solar";
  }
  return "border-success/25 bg-success/10 text-success";
}

function toneTextClass(tone: GuidanceTone) {
  if (tone === "risk") {
    return "text-risk";
  }
  if (tone === "solar") {
    return "text-solar";
  }
  if (tone === "success") {
    return "text-success";
  }
  if (tone === "violet") {
    return "text-violet";
  }
  return "text-cyan";
}
