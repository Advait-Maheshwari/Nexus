import { useEffect, useMemo, useState } from "react";

import {
  createIdea as createIdeaApi,
  createJournalEntry as createJournalApi,
  createMilestone as createMilestoneApi,
  listIdeas,
  listJournal,
  listMilestones,
  listWorkspaceProjects,
  updateMilestone as updateMilestoneApi
} from "@/lib/api";
import type { NexusSession } from "@/types/auth";
import type { WorkStatus } from "@/types/domain";
import type {
  JournalRecord,
  PlanningProject,
  ProjectIdea,
  ProjectMilestone
} from "@/types/planning";

interface PlanningState {
  projects: PlanningProject[];
  ideas: ProjectIdea[];
  journal: JournalRecord[];
  milestones: ProjectMilestone[];
}

const initialState: PlanningState = {
  projects: [{ id: "local-nexus", name: "Nexus", codename: "ORION" }],
  ideas: [
    {
      id: "idea-spatial-review",
      projectId: "local-nexus",
      title: "Spatial weekly review",
      body: "Turn the weekly report into a guided flight through project systems.",
      score: 86,
      source: "Product",
      createdAt: new Date().toISOString()
    }
  ],
  journal: [],
  milestones: [
    {
      id: "milestone-secure-launch",
      projectId: "local-nexus",
      title: "Secure cloud launch",
      description: "Identity exchange, database deployment, and isolation tests.",
      status: "in_progress",
      dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      createdAt: new Date().toISOString()
    }
  ]
};

export function usePlanningWorkspace(session: NexusSession) {
  const storageKey = `nexus.planning.v1.${session.workspaceId}`;
  const [state, setState] = useState<PlanningState>(() => load(storageKey));
  const [selectedProjectId, setSelectedProjectId] = useState(state.projects[0]?.id ?? "");
  const [mode, setMode] = useState<"api" | "local">(session.mode === "api" ? "api" : "local");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session.mode !== "api") {
      setMode("local");
      return;
    }
    let active = true;
    Promise.all([
      listWorkspaceProjects(session.accessToken),
      listIdeas(session.accessToken),
      listJournal(session.accessToken),
      listMilestones(session.accessToken)
    ])
      .then(([projects, ideas, journal, milestones]) => {
        if (!active) return;
        const planningProjects = projects.map(({ id, name, codename }) => ({ id, name, codename }));
        setState({ projects: planningProjects, ideas, journal, milestones });
        setSelectedProjectId(planningProjects[0]?.id ?? "");
        setMode("api");
        setError("");
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Planning API unavailable");
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, session.mode]);

  useEffect(() => {
    if (mode === "local") localStorage.setItem(storageKey, JSON.stringify(state));
  }, [mode, state, storageKey]);

  const selectedIdeas = useMemo(
    () => state.ideas.filter((item) => item.projectId === selectedProjectId),
    [selectedProjectId, state.ideas]
  );
  const selectedJournal = useMemo(
    () => state.journal.filter((item) => item.projectId === selectedProjectId),
    [selectedProjectId, state.journal]
  );
  const selectedMilestones = useMemo(
    () => state.milestones.filter((item) => item.projectId === selectedProjectId),
    [selectedProjectId, state.milestones]
  );

  async function createIdea(input: {
    title: string;
    body?: string;
    score: number;
    source?: string;
  }) {
    if (!selectedProjectId) return;
    const idea =
      mode === "api"
        ? await createIdeaApi(selectedProjectId, input, session.accessToken)
        : {
            id: crypto.randomUUID(),
            projectId: selectedProjectId,
            createdAt: new Date().toISOString(),
            ...input
          };
    setState((current) => ({ ...current, ideas: [idea, ...current.ideas] }));
  }

  async function createJournal(input: { title: string; body: string; mood?: string }) {
    if (!selectedProjectId) return;
    const entry =
      mode === "api"
        ? await createJournalApi(selectedProjectId, input, session.accessToken)
        : {
            id: crypto.randomUUID(),
            projectId: selectedProjectId,
            createdAt: new Date().toISOString(),
            summary: input.body.slice(0, 240),
            ...input
          };
    setState((current) => ({ ...current, journal: [entry, ...current.journal] }));
  }

  async function createMilestone(input: {
    title: string;
    description?: string;
    dueDate?: string;
  }) {
    if (!selectedProjectId) return;
    const milestone =
      mode === "api"
        ? await createMilestoneApi(
            selectedProjectId,
            {
              title: input.title,
              description: input.description,
              due_date: input.dueDate ? new Date(input.dueDate).toISOString() : undefined
            },
            session.accessToken
          )
        : {
            id: crypto.randomUUID(),
            projectId: selectedProjectId,
            status: "backlog" as const,
            dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : undefined,
            createdAt: new Date().toISOString(),
            title: input.title,
            description: input.description
          };
    setState((current) => ({ ...current, milestones: [...current.milestones, milestone] }));
  }

  async function advanceMilestone(milestone: ProjectMilestone) {
    const nextStatus: WorkStatus =
      milestone.status === "done"
        ? "done"
        : milestone.status === "in_progress"
          ? "done"
          : "in_progress";
    const updated =
      mode === "api"
        ? await updateMilestoneApi(milestone.id, { status: nextStatus }, session.accessToken)
        : { ...milestone, status: nextStatus, completedAt: nextStatus === "done" ? new Date().toISOString() : undefined };
    setState((current) => ({
      ...current,
      milestones: current.milestones.map((item) => (item.id === updated.id ? updated : item))
    }));
  }

  return {
    mode,
    error,
    projects: state.projects,
    selectedProjectId,
    selectProject: setSelectedProjectId,
    ideas: selectedIdeas,
    journal: selectedJournal,
    milestones: selectedMilestones,
    createIdea,
    createJournal,
    createMilestone,
    advanceMilestone
  };
}

function load(storageKey: string): PlanningState {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as PlanningState) : initialState;
  } catch {
    return initialState;
  }
}
