import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Circle,
  Flag,
  Pencil,
  Plus,
  Save,
  Target,
  X
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useProjectBlueprint } from "@/hooks/useProjectBlueprint";
import type { ProjectBlueprint, ProjectStep } from "@/types/blueprint";

export function ProjectOverview({
  projectId,
  projectName
}: {
  projectId: string;
  projectName: string;
}) {
  const { blueprint, save } = useProjectBlueprint(projectId, projectName);
  const [draft, setDraft] = useState(blueprint);
  const [editing, setEditing] = useState(false);

  const completion = useMemo(() => calculateCompletion(blueprint), [blueprint]);

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

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-solar">
            Project Blueprint
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Final Outcome & Plan</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs text-success">
            {completion}% aligned
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

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-solar via-violet to-cyan"
          style={{ width: `${completion}%` }}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
              Project Goals
            </h4>
            {editing ? (
              <AddButton
                label="Add goal"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    goals: [
                      ...current.goals,
                      { id: crypto.randomUUID(), title: "New project goal", completed: false }
                    ]
                  }))
                }
              />
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            {(editing ? draft.goals : blueprint.goals).map((goal) => (
              <div
                key={goal.id}
                className="flex min-h-12 items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2"
              >
                <button
                  type="button"
                  disabled={editing}
                  onClick={() => toggleGoal(goal.id)}
                  className={goal.completed ? "text-success" : "text-slate-500"}
                  aria-label={goal.completed ? "Mark goal incomplete" : "Mark goal complete"}
                >
                  {goal.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>
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
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                  />
                ) : (
                  <span className={`text-sm ${goal.completed ? "text-slate-500 line-through" : "text-white"}`}>
                    {goal.title}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
              Completion Steps
            </h4>
            {editing ? (
              <AddButton
                label="Add step"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    steps: [
                      ...current.steps,
                      { id: crypto.randomUUID(), title: "New completion step", status: "pending" }
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
                className="grid min-h-12 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2"
              >
                <span className="font-mono text-xs text-cyan">{String(index + 1).padStart(2, "0")}</span>
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
                    className="min-w-0 bg-transparent text-sm text-white outline-none"
                  />
                ) : (
                  <span className="text-sm text-white">{step.title}</span>
                )}
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => advanceStep(step.id)}
                    disabled={step.status === "done"}
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                      step.status === "done"
                        ? "border-success/25 bg-success/10 text-success"
                        : step.status === "active"
                          ? "border-cyan/25 bg-cyan/10 text-cyan"
                          : "border-white/10 text-slate-500"
                    }`}
                  >
                    {step.status}
                  </button>
                ) : (
                  <Check size={15} className="text-slate-600" />
                )}
              </div>
            ))}
          </div>
        </div>
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
  icon: React.ReactNode;
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
          className="mt-3 min-h-24 w-full resize-y rounded-md border border-white/10 bg-navy p-3 text-sm leading-6 text-white outline-none focus:border-cyan/50"
        />
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-300">{value}</p>
      )}
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
