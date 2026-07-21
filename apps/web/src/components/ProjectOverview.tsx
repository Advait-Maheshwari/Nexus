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
  UserRound,
  Users,
  X
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useProjectBlueprint } from "@/hooks/useProjectBlueprint";
import type { ProjectBlueprint, ProjectStep, ProjectTeam } from "@/types/blueprint";
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

type TeamDeliveryState = "on_track" | "watch" | "lagging" | "unassigned";

interface TeamDelivery {
  team: ProjectTeam;
  assignedTasks: WorkspaceTask[];
  completion: number;
  blockedCount: number;
  overdueCount: number;
  activeCount: number;
  state: TeamDeliveryState;
}

export function ProjectOverview({
  projectId,
  projectName,
  accessToken,
  projectProgress = 0,
  healthScore = 100,
  features = [],
  tasks = []
}: {
  projectId: string;
  projectName: string;
  accessToken: string;
  projectProgress?: number;
  healthScore?: number;
  features?: WorkspaceFeature[];
  tasks?: WorkspaceTask[];
}) {
  const { blueprint, save, loading, saving, error } = useProjectBlueprint(
    projectId,
    projectName,
    accessToken
  );
  const [draft, setDraft] = useState(blueprint);
  const [editing, setEditing] = useState(false);

  const completion = useMemo(() => calculateCompletion(blueprint), [blueprint]);
  const guidance = useMemo(
    () => buildGuidance(blueprint, features, tasks, projectProgress),
    [blueprint, features, tasks, projectProgress]
  );
  const risks = useMemo(
    () => buildRisks(blueprint, features, tasks, projectProgress),
    [blueprint, features, tasks, projectProgress]
  );
  const teamDelivery = useMemo(
    () => buildTeamDelivery(blueprint.teams, tasks, projectProgress),
    [blueprint.teams, tasks, projectProgress]
  );
  const assignedTaskIds = useMemo(
    () => new Set(blueprint.teams.flatMap((team) => team.taskIds)),
    [blueprint.teams]
  );
  const unassignedTasks = tasks.filter((task) => !assignedTaskIds.has(task.id));
  const missionScore = Math.round(completion * 0.45 + projectProgress * 0.35 + healthScore * 0.2);
  const activeStep =
    blueprint.steps.find((step) => step.status === "active") ??
    blueprint.steps.find((step) => step.status === "pending");

  function beginEditing() {
    setDraft(blueprint);
    setEditing(true);
  }

  async function saveDraft() {
    if (await save(draft)) {
      setEditing(false);
    }
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

  function addTeam() {
    setDraft((current) => ({
      ...current,
      teams: [
        ...current.teams,
        {
          id: crypto.randomUUID(),
          name: "New delivery team",
          lead: "Unassigned",
          responsibility: "Define the outcome this team owns.",
          taskIds: []
        }
      ]
    }));
  }

  function updateTeam(teamId: string, patch: Partial<ProjectTeam>) {
    setDraft((current) => ({
      ...current,
      teams: current.teams.map((team) => (team.id === teamId ? { ...team, ...patch } : team))
    }));
  }

  function removeTeam(teamId: string) {
    setDraft((current) => ({
      ...current,
      teams: current.teams.filter((team) => team.id !== teamId)
    }));
  }

  function assignTask(teamId: string, taskId: string) {
    if (!taskId) {
      return;
    }
    setDraft((current) => ({
      ...current,
      teams: current.teams.map((team) => ({
        ...team,
        taskIds:
          team.id === teamId
            ? [...team.taskIds.filter((id) => id !== taskId), taskId]
            : team.taskIds.filter((id) => id !== taskId)
      }))
    }));
  }

  function unassignTask(teamId: string, taskId: string) {
    setDraft((current) => ({
      ...current,
      teams: current.teams.map((team) =>
        team.id === teamId
          ? { ...team, taskIds: team.taskIds.filter((id) => id !== taskId) }
          : team
      )
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
                disabled={saving}
                onClick={() => void saveDraft()}
              />
            </>
          ) : (
            <Button
              variant="ghost"
              className="h-10 w-10 px-0"
              icon={<Pencil size={16} />}
              aria-label="Edit project blueprint"
              title="Edit blueprint"
              disabled={loading || saving}
              onClick={beginEditing}
            />
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="mt-4 text-sm text-slate-400">
          Loading the server-owned execution plan...
        </p>
      ) : null}
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
                      disabled={editing || saving}
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
                        disabled={step.status === "done" || saving}
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

      <section className="mt-5 border-t border-white/10 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-cyan">
              <Users size={18} />
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                Team Accountability
              </h4>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-400">
              Ownership, assigned work, and delivery pressure for every team responsible for this goal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AccountabilityBadge
              label={`${blueprint.teams.length} team${blueprint.teams.length === 1 ? "" : "s"}`}
              tone="neutral"
            />
            <AccountabilityBadge
              label={`${unassignedTasks.length} unassigned`}
              tone={unassignedTasks.length > 0 ? "watch" : "healthy"}
            />
            <AccountabilityBadge
              label={`${teamDelivery.filter((team) => team.state === "lagging").length} lagging`}
              tone={teamDelivery.some((team) => team.state === "lagging") ? "risk" : "healthy"}
            />
            {editing ? <AddButton label="Add team" onClick={addTeam} /> : null}
          </div>
        </div>

        {editing ? (
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {draft.teams.length > 0 ? (
              draft.teams.map((team) => {
                const assignedTasks = tasks.filter((task) => team.taskIds.includes(task.id));
                const assignedElsewhere = new Set(
                  draft.teams
                    .filter((item) => item.id !== team.id)
                    .flatMap((item) => item.taskIds)
                );
                const availableTasks = tasks.filter((task) => !assignedElsewhere.has(task.id));

                return (
                  <div key={team.id} className="grid gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs text-slate-500">
                        Team name
                        <input
                          value={team.name}
                          onChange={(event) => updateTeam(team.id, { name: event.target.value })}
                          className="mt-1 h-10 w-full rounded-md border border-white/10 bg-navy px-3 text-sm text-white outline-none focus:border-cyan/50"
                        />
                      </label>
                      <label className="text-xs text-slate-500">
                        Team lead
                        <input
                          value={team.lead}
                          onChange={(event) => updateTeam(team.id, { lead: event.target.value })}
                          className="mt-1 h-10 w-full rounded-md border border-white/10 bg-navy px-3 text-sm text-white outline-none focus:border-cyan/50"
                        />
                      </label>
                      <label className="text-xs text-slate-500 sm:col-span-2">
                        Responsibility
                        <textarea
                          value={team.responsibility}
                          onChange={(event) => updateTeam(team.id, { responsibility: event.target.value })}
                          className="mt-1 min-h-20 w-full resize-y rounded-md border border-white/10 bg-navy p-3 text-sm leading-5 text-white outline-none focus:border-cyan/50"
                        />
                      </label>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">Assigned tasks</span>
                        <button
                          type="button"
                          onClick={() => removeTeam(team.id)}
                          className="text-slate-500 transition hover:text-risk"
                          aria-label={`Remove ${team.name}`}
                          title="Remove team"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <select
                        value=""
                        onChange={(event) => assignTask(team.id, event.target.value)}
                        disabled={availableTasks.length === assignedTasks.length}
                        className="mt-1 h-10 w-full rounded-md border border-white/10 bg-navy px-3 text-sm text-white outline-none focus:border-cyan/50 disabled:opacity-50"
                      >
                        <option value="">Assign a task...</option>
                        {availableTasks
                          .filter((task) => !team.taskIds.includes(task.id))
                          .map((task) => (
                            <option key={task.id} value={task.id}>
                              {task.title}
                            </option>
                          ))}
                      </select>
                      <div className="mt-2 space-y-1.5">
                        {assignedTasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                            <span className="min-w-0 truncate text-sm text-slate-300">{task.title}</span>
                            <button
                              type="button"
                              onClick={() => unassignTask(team.id, task.id)}
                              className="shrink-0 text-slate-500 transition hover:text-risk"
                              aria-label={`Unassign ${task.title}`}
                              title="Unassign task"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-5 text-sm text-slate-400">Add the first team to define delivery ownership.</p>
            )}
          </div>
        ) : teamDelivery.length > 0 ? (
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {teamDelivery.map((delivery) => (
              <TeamDeliveryRow key={delivery.team.id} delivery={delivery} />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-md border border-dashed border-white/15 p-4 text-sm text-slate-400">
            <Users size={18} className="shrink-0 text-slate-500" />
            Edit the blueprint to define which teams own this project and assign their tasks.
          </div>
        )}

        {!editing && unassignedTasks.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-solar/20 bg-solar/[0.055] px-3 py-2.5">
            <AlertTriangle size={16} className="shrink-0 text-solar" />
            <span className="text-sm font-medium text-slate-200">Needs an owner:</span>
            <span className="min-w-0 text-sm text-slate-400">
              {unassignedTasks.slice(0, 3).map((task) => task.title).join(", ")}
              {unassignedTasks.length > 3 ? ` and ${unassignedTasks.length - 3} more` : ""}
            </span>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function TeamDeliveryRow({ delivery }: { delivery: TeamDelivery }) {
  return (
    <article className="grid gap-4 py-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(260px,1fr)_minmax(280px,1.15fr)] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h5 className="text-sm font-semibold text-white">{delivery.team.name}</h5>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]", teamStateClass(delivery.state))}>
            {teamStateLabel(delivery.state)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
          <UserRound size={14} className="shrink-0 text-violet" />
          <span>{delivery.team.lead}</span>
        </div>
        <p className="mt-2 text-sm leading-5 text-slate-400">{delivery.team.responsibility}</p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>Team delivery</span>
          <span className="font-mono text-slate-300">{delivery.completion}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn("h-full rounded-full", teamProgressClass(delivery.state))}
            style={{ width: `${delivery.completion}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <AccountabilityBadge label={`${delivery.assignedTasks.length} assigned`} tone="neutral" />
          <AccountabilityBadge label={`${delivery.activeCount} active`} tone="healthy" />
          <AccountabilityBadge label={`${delivery.blockedCount} blocked`} tone={delivery.blockedCount ? "risk" : "neutral"} />
          <AccountabilityBadge label={`${delivery.overdueCount} overdue`} tone={delivery.overdueCount ? "risk" : "neutral"} />
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500">Task ownership</p>
        {delivery.assignedTasks.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {delivery.assignedTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-300">{task.title}</span>
                <span className={cn("shrink-0 text-[10px] uppercase tracking-[0.08em]", taskStatusClass(task.status))}>
                  {task.status.replace("_", " ")}
                </span>
              </div>
            ))}
            {delivery.assignedTasks.length > 4 ? (
              <p className="text-xs text-slate-500">+{delivery.assignedTasks.length - 4} more assigned tasks</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No tasks assigned yet.</p>
        )}
      </div>
    </article>
  );
}

function AccountabilityBadge({
  label,
  tone
}: {
  label: string;
  tone: "neutral" | "healthy" | "watch" | "risk";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em]",
        tone === "risk" && "border-risk/25 bg-risk/10 text-risk",
        tone === "watch" && "border-solar/25 bg-solar/10 text-solar",
        tone === "healthy" && "border-success/25 bg-success/10 text-success",
        tone === "neutral" && "border-white/10 bg-white/[0.04] text-slate-400"
      )}
    >
      {label}
    </span>
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

function buildTeamDelivery(
  teams: ProjectTeam[],
  tasks: WorkspaceTask[],
  projectProgress: number
): TeamDelivery[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return teams.map((team) => {
    const assignedTasks = team.taskIds
      .map((taskId) => taskById.get(taskId))
      .filter((task): task is WorkspaceTask => Boolean(task));
    const completedCount = assignedTasks.filter((task) => task.status === "done").length;
    const blockedCount = assignedTasks.filter((task) => task.status === "blocked").length;
    const activeCount = assignedTasks.filter((task) => task.status === "in_progress").length;
    const overdueCount = assignedTasks.filter((task) => {
      if (!task.dueDate || task.status === "done" || task.status === "archived") {
        return false;
      }
      const dueDate = new Date(task.dueDate);
      return !Number.isNaN(dueDate.getTime()) && dueDate < today;
    }).length;
    const completion = assignedTasks.length
      ? Math.round((completedCount / assignedTasks.length) * 100)
      : 0;
    const deliveryGap = projectProgress - completion;
    const priorityPressure = assignedTasks.some(
      (task) =>
        task.status !== "done" &&
        task.status !== "archived" &&
        (task.priority === "critical" || task.priority === "high")
    );

    let state: TeamDeliveryState = "on_track";
    if (assignedTasks.length === 0) {
      state = "unassigned";
    } else if (
      blockedCount > 0 ||
      overdueCount > 0 ||
      (assignedTasks.length >= 2 && deliveryGap >= 25)
    ) {
      state = "lagging";
    } else if (deliveryGap >= 10 || (activeCount === 0 && completion < 100) || priorityPressure) {
      state = "watch";
    }

    return {
      team,
      assignedTasks,
      completion,
      blockedCount,
      overdueCount,
      activeCount,
      state
    };
  });
}

function buildGuidance(
  blueprint: ProjectBlueprint,
  features: WorkspaceFeature[],
  tasks: WorkspaceTask[],
  projectProgress: number
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
  const laggingTeam = buildTeamDelivery(blueprint.teams, tasks, projectProgress).find(
    (delivery) => delivery.state === "lagging"
  );

  const actions: GuidanceAction[] = [];

  if (laggingTeam) {
    const pressure = [
      laggingTeam.blockedCount
        ? `${laggingTeam.blockedCount} blocked`
        : null,
      laggingTeam.overdueCount
        ? `${laggingTeam.overdueCount} overdue`
        : null
    ].filter(Boolean);
    actions.push({
      title: `Recover ${laggingTeam.team.name}`,
      body: `${laggingTeam.team.lead} owns this recovery. Review ${laggingTeam.assignedTasks.length} assigned task${laggingTeam.assignedTasks.length === 1 ? "" : "s"}${pressure.length ? `, including ${pressure.join(" and ")}` : ""}, remove the highest-impact constraint, and confirm the next deliverable.`,
      confidence: 96,
      tone: "risk"
    });
  }

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

function teamStateLabel(state: TeamDeliveryState) {
  if (state === "on_track") {
    return "On track";
  }
  if (state === "watch") {
    return "Watch";
  }
  if (state === "lagging") {
    return "Lagging";
  }
  return "Needs tasks";
}

function teamStateClass(state: TeamDeliveryState) {
  if (state === "lagging") {
    return "border-risk/25 bg-risk/10 text-risk";
  }
  if (state === "watch") {
    return "border-solar/25 bg-solar/10 text-solar";
  }
  if (state === "on_track") {
    return "border-success/25 bg-success/10 text-success";
  }
  return "border-white/10 bg-white/[0.04] text-slate-400";
}

function teamProgressClass(state: TeamDeliveryState) {
  if (state === "lagging") {
    return "bg-risk";
  }
  if (state === "watch") {
    return "bg-solar";
  }
  if (state === "on_track") {
    return "bg-success";
  }
  return "bg-slate-600";
}

function taskStatusClass(status: WorkspaceTask["status"]) {
  if (status === "blocked") {
    return "text-risk";
  }
  if (status === "done") {
    return "text-success";
  }
  if (status === "in_progress") {
    return "text-cyan";
  }
  if (status === "ready") {
    return "text-solar";
  }
  return "text-slate-500";
}
