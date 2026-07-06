import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Database,
  FolderKanban,
  HardDrive,
  ListTodo,
  Network,
  Plus,
  ShieldAlert
} from "lucide-react";

import { StatusPill } from "@/components/StatusPill";
import { ProjectOverview } from "@/components/ProjectOverview";
import { Button } from "@/components/ui/Button";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";
import { cn } from "@/lib/utils";
import type { Priority, WorkStatus } from "@/types/domain";

const nextStatus: Record<WorkStatus, WorkStatus> = {
  backlog: "ready",
  ready: "in_progress",
  in_progress: "done",
  blocked: "in_progress",
  done: "done",
  archived: "archived"
};

export function ProjectsView() {
  const workspace = useProjectWorkspace();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const completion = useMemo(() => {
    if (workspace.tasks.length === 0) {
      return 0;
    }
    const done = workspace.tasks.filter((task) => task.status === "done").length;
    return Math.round((done / workspace.tasks.length) * 100);
  }, [workspace.tasks]);

  return (
    <section className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="glass-panel rounded-lg p-3">
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">Portfolio</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Projects</h2>
          </div>
          <Button
            aria-label="Create project"
            title="Create project"
            className="h-10 w-10 px-0"
            icon={<Plus size={17} />}
            onClick={() => setShowProjectForm((visible) => !visible)}
          />
        </div>

        <div className="mt-3 space-y-2">
          {workspace.projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => workspace.selectProject(project.id)}
              className={cn(
                "w-full rounded-md border p-3 text-left transition",
                workspace.selectedProjectId === project.id
                  ? "border-cyan/40 bg-cyan/10 shadow-glow"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
                  {project.codename}
                </span>
                <ChevronRight size={15} className="text-slate-500" />
              </div>
              <strong className="mt-2 block text-sm text-white">{project.name}</strong>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-white/10 px-2 pt-4 text-xs text-slate-400">
          {workspace.mode === "api" ? (
            <Database size={14} className="text-success" />
          ) : (
            <HardDrive size={14} className="text-solar" />
          )}
          {workspace.mode === "api" ? "Local API connected" : "Offline local mode"}
        </div>
      </aside>

      <div className="space-y-4">
        {showProjectForm ? (
          <ProjectForm
            onSubmit={async (input) => {
              await workspace.createProject(input);
              setShowProjectForm(false);
            }}
          />
        ) : null}

        {workspace.selectedProject ? (
          <>
            <header className="glass-panel rounded-lg p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan">
                    {workspace.selectedProject.codename}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {workspace.selectedProject.name}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    {workspace.selectedProject.description ?? "No project brief yet."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={workspace.selectedProject.status} />
                  <span className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs text-success">
                    Health {workspace.selectedProject.healthScore}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric icon={<Activity size={17} />} label="Completion" value={`${completion}%`} />
                <Metric
                  icon={<Network size={17} />}
                  label="Features"
                  value={workspace.features.length.toString()}
                />
                <Metric
                  icon={<ListTodo size={17} />}
                  label="Tasks"
                  value={workspace.tasks.length.toString()}
                />
              </div>
            </header>

            <ProjectOverview
              projectId={workspace.selectedProject.id}
              projectName={workspace.selectedProject.name}
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="glass-panel rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.22em] text-violet">
                      Feature Plan
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">Planets</h3>
                  </div>
                  <Button
                    aria-label="Create feature"
                    title="Create feature"
                    className="h-10 w-10 px-0"
                    icon={<Plus size={17} />}
                    onClick={() => setShowFeatureForm((visible) => !visible)}
                  />
                </div>

                {showFeatureForm ? (
                  <FeatureForm
                    onSubmit={async (input) => {
                      await workspace.createFeature(input);
                      setShowFeatureForm(false);
                    }}
                  />
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {workspace.features.map((feature) => (
                    <article
                      key={feature.id}
                      className="rounded-md border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-white">{feature.title}</h4>
                          <p className="mt-1 text-xs text-slate-500">
                            {feature.taskCount} tasks / {feature.blockedTaskCount} blocked
                          </p>
                        </div>
                        <StatusPill status={feature.status} />
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
                          style={{ width: `${feature.progress}%` }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="glass-panel rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.22em] text-solar">
                      Work Queue
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">Tasks</h3>
                  </div>
                  <Button
                    aria-label="Create task"
                    title="Create task"
                    className="h-10 w-10 px-0"
                    icon={<Plus size={17} />}
                    onClick={() => setShowTaskForm((visible) => !visible)}
                  />
                </div>

                {showTaskForm ? (
                  <TaskForm
                    features={workspace.features}
                    onSubmit={async (input) => {
                      await workspace.createTask(input);
                      setShowTaskForm(false);
                    }}
                  />
                ) : null}

                <div className="mt-4 space-y-2">
                  {workspace.tasks.map((task) => (
                    <article
                      key={task.id}
                      className="rounded-md border border-white/10 bg-white/[0.04] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-white">{task.title}</h4>
                          <p className="mt-1 text-xs text-slate-500">
                            {task.estimateMinutes} min estimate
                          </p>
                        </div>
                        <TaskStatusIcon status={task.status} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <StatusPill status={task.status} />
                        {task.status !== "done" && task.status !== "archived" ? (
                          <Button
                            variant="ghost"
                            className="min-h-8 px-2 text-xs"
                            onClick={() =>
                              workspace.setTaskStatus(task.id, nextStatus[task.status])
                            }
                          >
                            Advance
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="glass-panel flex min-h-[420px] items-center justify-center rounded-lg">
            <div className="text-center">
              <FolderKanban className="mx-auto text-cyan" size={36} />
              <p className="mt-4 text-slate-300">Create your first project.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
      <span className="text-cyan">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function ProjectForm({
  onSubmit
}: {
  onSubmit: (input: {
    name: string;
    codename: string;
    description?: string;
    priority: Priority;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [codename, setCodename] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ name, codename: codename.toUpperCase(), description, priority });
  }

  return (
    <form onSubmit={submit} className="glass-panel grid gap-3 rounded-lg p-4 md:grid-cols-2">
      <TextInput label="Project name" value={name} onChange={setName} required />
      <TextInput label="Codename" value={codename} onChange={setCodename} required />
      <TextInput label="Brief" value={description} onChange={setDescription} />
      <PrioritySelect value={priority} onChange={setPriority} />
      <Button className="md:col-span-2" variant="primary" type="submit" icon={<Plus size={16} />}>
        Create Project
      </Button>
    </form>
  );
}

function FeatureForm({
  onSubmit
}: {
  onSubmit: (input: {
    title: string;
    description?: string;
    priority: Priority;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ title, priority });
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 border-t border-white/10 pt-4">
      <TextInput label="Feature name" value={title} onChange={setTitle} required />
      <PrioritySelect value={priority} onChange={setPriority} />
      <Button type="submit" variant="primary" icon={<Network size={16} />}>
        Add Feature
      </Button>
    </form>
  );
}

function TaskForm({
  features,
  onSubmit
}: {
  features: Array<{ id: string; title: string }>;
  onSubmit: (input: {
    title: string;
    featureId?: string;
    priority: Priority;
    estimateMinutes: number;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [featureId, setFeatureId] = useState(features[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("medium");
  const [estimateMinutes, setEstimateMinutes] = useState(60);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ title, featureId: featureId || undefined, priority, estimateMinutes });
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 border-t border-white/10 pt-4">
      <TextInput label="Task title" value={title} onChange={setTitle} required />
      <label className="grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
        Feature
        <select
          value={featureId}
          onChange={(event) => setFeatureId(event.target.value)}
          className="h-10 rounded-md border border-white/10 bg-navy px-3 text-sm normal-case text-white outline-none focus:border-cyan/50"
        >
          <option value="">No feature</option>
          {features.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {feature.title}
            </option>
          ))}
        </select>
      </label>
      <PrioritySelect value={priority} onChange={setPriority} />
      <label className="grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
        Estimate minutes
        <input
          type="number"
          min={0}
          value={estimateMinutes}
          onChange={(event) => setEstimateMinutes(Number(event.target.value))}
          className="h-10 rounded-md border border-white/10 bg-navy px-3 text-sm normal-case text-white outline-none focus:border-cyan/50"
        />
      </label>
      <Button type="submit" variant="primary" icon={<ListTodo size={16} />}>
        Add Task
      </Button>
    </form>
  );
}

function TextInput({
  label,
  value,
  onChange,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
      {label}
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-white/10 bg-navy px-3 text-sm normal-case text-white outline-none focus:border-cyan/50"
      />
    </label>
  );
}

function PrioritySelect({
  value,
  onChange
}: {
  value: Priority;
  onChange: (value: Priority) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
      Priority
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Priority)}
        className="h-10 rounded-md border border-white/10 bg-navy px-3 text-sm normal-case text-white outline-none focus:border-cyan/50"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
    </label>
  );
}

function TaskStatusIcon({ status }: { status: WorkStatus }) {
  if (status === "done") {
    return <CheckCircle2 size={18} className="text-success" />;
  }
  if (status === "blocked") {
    return <ShieldAlert size={18} className="text-risk" />;
  }
  if (status === "in_progress") {
    return <Activity size={18} className="text-cyan" />;
  }
  return <CircleDashed size={18} className="text-slate-500" />;
}
