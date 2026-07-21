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
import { notifyMissionDataChanged } from "@/lib/missionEvents";
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
  projects: [],
  ideas: [],
  journal: [],
  milestones: []
};

export function usePlanningWorkspace(session: NexusSession) {
  const [state, setState] = useState<PlanningState>(initialState);
  const [selectedProjectId, setSelectedProjectId] = useState(state.projects[0]?.id ?? "");
  const mode = "api" as const;
  const [error, setError] = useState("");

  useEffect(() => {
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
    const idea = await createIdeaApi(selectedProjectId, input, session.accessToken);
    setState((current) => ({ ...current, ideas: [idea, ...current.ideas] }));
    notifyMissionDataChanged();
  }

  async function createJournal(input: { title: string; body: string; mood?: string }) {
    if (!selectedProjectId) return;
    const entry = await createJournalApi(selectedProjectId, input, session.accessToken);
    setState((current) => ({ ...current, journal: [entry, ...current.journal] }));
    notifyMissionDataChanged();
  }

  async function createMilestone(input: {
    title: string;
    description?: string;
    dueDate?: string;
  }) {
    if (!selectedProjectId) return;
    const milestone = await createMilestoneApi(
      selectedProjectId,
      {
        title: input.title,
        description: input.description,
        due_date: input.dueDate ? new Date(input.dueDate).toISOString() : undefined
      },
      session.accessToken
    );
    setState((current) => ({ ...current, milestones: [...current.milestones, milestone] }));
    notifyMissionDataChanged();
  }

  async function advanceMilestone(milestone: ProjectMilestone) {
    const nextStatus: WorkStatus =
      milestone.status === "done"
        ? "done"
        : milestone.status === "in_progress"
          ? "done"
          : "in_progress";
    const updated = await updateMilestoneApi(
      milestone.id,
      { status: nextStatus },
      session.accessToken
    );
    setState((current) => ({
      ...current,
      milestones: current.milestones.map((item) => (item.id === updated.id ? updated : item))
    }));
    notifyMissionDataChanged();
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
