import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lightbulb,
  NotebookPen,
  Plus,
  Sparkles
} from "lucide-react";

import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/Button";
import { usePlanningWorkspace } from "@/hooks/usePlanningWorkspace";
import type { NexusSession } from "@/types/auth";
import type { ProjectMilestone } from "@/types/planning";

export function CalendarView({ session }: { session: NexusSession }) {
  const workspace = usePlanningWorkspace(session);
  const [cursor, setCursor] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);
  const monthDays = useMemo(() => buildMonth(cursor, workspace.milestones), [cursor, workspace.milestones]);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <PlanningShell
      eyebrow="Schedule"
      title="Calendar"
      icon={<CalendarDays size={24} />}
      workspace={workspace}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="glass-panel rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="h-10 w-10 px-0"
              icon={<ArrowLeft size={17} />}
              aria-label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            />
            <h3 className="font-semibold text-white">{monthLabel}</h3>
            <Button
              variant="ghost"
              className="h-10 w-10 px-0"
              icon={<ArrowRight size={17} />}
              aria-label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            />
          </div>
          <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-md border border-white/10 bg-white/10">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="bg-navy px-1 py-2 text-center font-mono text-[10px] text-slate-500">
                {day}
              </div>
            ))}
            {monthDays.map((day) => (
              <div
                key={day.key}
                className={`min-h-24 bg-void p-2 ${day.currentMonth ? "" : "opacity-35"}`}
              >
                <span className={`text-xs ${day.today ? "text-cyan" : "text-slate-500"}`}>
                  {day.date.getDate()}
                </span>
                <div className="mt-2 space-y-1">
                  {day.milestones.slice(0, 2).map((milestone) => (
                    <div
                      key={milestone.id}
                      className={`truncate rounded-sm px-1.5 py-1 text-[10px] ${
                        milestone.status === "done"
                          ? "bg-success/10 text-success"
                          : "bg-violet/15 text-violet"
                      }`}
                      title={milestone.title}
                    >
                      {milestone.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-3">
          <div className="flex justify-end">
            <Button icon={<Plus size={16} />} onClick={() => setShowForm((value) => !value)}>
              Milestone
            </Button>
          </div>
          {showForm ? (
            <MilestoneForm
              onSubmit={async (input) => {
                await workspace.createMilestone(input);
                setShowForm(false);
              }}
            />
          ) : null}
          <section className="glass-panel rounded-lg p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Milestones</p>
            <div className="mt-3 space-y-2">
              {workspace.milestones.map((milestone) => (
                <article key={milestone.id} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{milestone.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(milestone.dueDate)}</p>
                    </div>
                    <StatusPill status={milestone.status} />
                  </div>
                  {milestone.status !== "done" ? (
                    <Button
                      variant="ghost"
                      className="mt-2 min-h-8 px-2 text-xs"
                      icon={milestone.status === "in_progress" ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
                      onClick={() => workspace.advanceMilestone(milestone)}
                    >
                      {milestone.status === "in_progress" ? "Complete" : "Start"}
                    </Button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </PlanningShell>
  );
}

export function IdeasView({ session }: { session: NexusSession }) {
  const workspace = usePlanningWorkspace(session);
  const [showForm, setShowForm] = useState(false);
  const ideas = [...workspace.ideas].sort((a, b) => b.score - a.score);

  return (
    <PlanningShell
      eyebrow="Incubator"
      title="Ideas"
      icon={<Lightbulb size={24} />}
      workspace={workspace}
    >
      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => setShowForm((value) => !value)}>
          Capture Idea
        </Button>
      </div>
      {showForm ? (
        <IdeaForm
          onSubmit={async (input) => {
            await workspace.createIdea(input);
            setShowForm(false);
          }}
        />
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ideas.map((idea) => (
          <article key={idea.id} className="glass-panel rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-md bg-solar/10 p-2 text-solar"><Sparkles size={17} /></span>
              <span className="font-mono text-lg font-semibold text-cyan">{idea.score}</span>
            </div>
            <h3 className="mt-4 font-semibold text-white">{idea.title}</h3>
            <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-300">{idea.body}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.15em] text-slate-500">{idea.source ?? "Nexus"}</p>
          </article>
        ))}
      </div>
    </PlanningShell>
  );
}

export function JournalView({ session }: { session: NexusSession }) {
  const workspace = usePlanningWorkspace(session);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState("focused");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await workspace.createJournal({ title, body, mood });
    setTitle("");
    setBody("");
  }

  return (
    <PlanningShell
      eyebrow="Project Memory"
      title="Journal"
      icon={<NotebookPen size={24} />}
      workspace={workspace}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={submit} className="glass-panel rounded-lg p-5">
          <FormInput label="Title" value={title} onChange={setTitle} required />
          <label className="mt-4 grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
            Mood
            <select
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              className="h-10 rounded-md border border-white/10 bg-navy px-3 text-sm normal-case text-white"
            >
              <option value="focused">Focused</option>
              <option value="energized">Energized</option>
              <option value="uncertain">Uncertain</option>
              <option value="blocked">Blocked</option>
              <option value="reflective">Reflective</option>
            </select>
          </label>
          <label className="mt-4 grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
            Entry
            <textarea
              required
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-56 resize-y rounded-md border border-white/10 bg-navy p-3 text-sm normal-case leading-6 text-white outline-none focus:border-cyan/50"
            />
          </label>
          <Button type="submit" className="mt-4 w-full" icon={<NotebookPen size={16} />}>
            Save Entry
          </Button>
        </form>
        <section className="space-y-3">
          {workspace.journal.length ? (
            workspace.journal.map((entry) => (
              <article key={entry.id} className="glass-panel rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">{entry.title}</h3>
                  <span className="rounded-full border border-violet/25 bg-violet/10 px-2 py-1 text-xs text-violet">
                    {entry.mood ?? "neutral"}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{entry.body}</p>
                <p className="mt-4 font-mono text-[11px] text-slate-500">{formatDate(entry.createdAt)}</p>
              </article>
            ))
          ) : (
            <div className="glass-panel flex min-h-72 items-center justify-center rounded-lg text-sm text-slate-500">
              No entries for this project.
            </div>
          )}
        </section>
      </div>
    </PlanningShell>
  );
}

function PlanningShell({
  eyebrow,
  title,
  icon,
  workspace,
  children
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  workspace: ReturnType<typeof usePlanningWorkspace>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">{eyebrow}</p>
          <div className="mt-2 flex items-center gap-3 text-white">{icon}<h2 className="text-2xl font-semibold">{title}</h2></div>
        </div>
        <select
          value={workspace.selectedProjectId}
          onChange={(event) => workspace.selectProject(event.target.value)}
          className="h-10 min-w-48 rounded-md border border-white/10 bg-navy px-3 text-sm text-white"
        >
          {workspace.projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name} / {project.codename}</option>
          ))}
        </select>
      </header>
      {workspace.error ? (
        <div className="mb-4 rounded-md border border-risk/25 bg-risk/10 px-4 py-3 text-sm text-risk">{workspace.error}</div>
      ) : null}
      {children}
    </section>
  );
}

function MilestoneForm({
  onSubmit
}: {
  onSubmit: (input: { title: string; description?: string; dueDate?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  return (
    <form
      className="glass-panel grid gap-3 rounded-lg p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({ title, description, dueDate });
      }}
    >
      <FormInput label="Milestone" value={title} onChange={setTitle} required />
      <FormInput label="Description" value={description} onChange={setDescription} />
      <label className="grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
        Due date
        <input
          type="date"
          required
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className="h-10 rounded-md border border-white/10 bg-navy px-3 text-sm text-white"
        />
      </label>
      <Button type="submit" icon={<Plus size={16} />}>Add Milestone</Button>
    </form>
  );
}

function IdeaForm({
  onSubmit
}: {
  onSubmit: (input: { title: string; body?: string; score: number; source?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [score, setScore] = useState(50);
  const [source, setSource] = useState("Personal");
  return (
    <form
      className="glass-panel mt-4 grid gap-3 rounded-lg p-4 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({ title, body, score, source });
      }}
    >
      <FormInput label="Idea" value={title} onChange={setTitle} required />
      <FormInput label="Source" value={source} onChange={setSource} />
      <FormInput label="Notes" value={body} onChange={setBody} />
      <label className="grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
        Potential {score}
        <input type="range" min="0" max="100" value={score} onChange={(event) => setScore(Number(event.target.value))} className="h-10 accent-cyan" />
      </label>
      <Button type="submit" className="md:col-span-2" icon={<Plus size={16} />}>Add Idea</Button>
    </form>
  );
}

function FormInput({
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
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-white/10 bg-navy px-3 text-sm normal-case text-white outline-none focus:border-cyan/50"
      />
    </label>
  );
}

function buildMonth(cursor: Date, milestones: ProjectMilestone[]) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    return {
      key: dateKey,
      date,
      currentMonth: date.getMonth() === cursor.getMonth(),
      today: dateKey === new Date().toISOString().slice(0, 10),
      milestones: milestones.filter((milestone) => milestone.dueDate?.slice(0, 10) === dateKey)
    };
  });
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "No date";
}
