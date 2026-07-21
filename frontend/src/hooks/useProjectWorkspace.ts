import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createWorkspaceFeature,
  createWorkspaceProject,
  createWorkspaceTask,
  listWorkspaceFeatures,
  listWorkspaceProjects,
  listWorkspaceTasks,
  updateWorkspaceTask
} from "@/lib/api";
import { notifyMissionDataChanged } from "@/lib/missionEvents";
import type { Priority, WorkStatus } from "@/types/domain";
import type { NexusSession } from "@/types/auth";
import type { WorkspaceFeature, WorkspaceProject, WorkspaceTask } from "@/types/workspace";

interface LocalState {
  projects: WorkspaceProject[];
  features: WorkspaceFeature[];
  tasks: WorkspaceTask[];
}

const emptyState: LocalState = { projects: [], features: [], tasks: [] };

export function useProjectWorkspace(session: NexusSession) {
  const [state, setState] = useState<LocalState>(emptyState);
  const [selectedProjectId, setSelectedProjectId] = useState(state.projects[0]?.id ?? "");
  const mode = "api" as const;
  const [error, setError] = useState("");

  const refreshApiProject = useCallback(async (projectId: string) => {
    const [features, tasks] = await Promise.all([
      listWorkspaceFeatures(projectId, session.accessToken),
      listWorkspaceTasks(projectId, session.accessToken)
    ]);
    setState((current) => ({ ...current, features, tasks }));
  }, [session.accessToken]);

  useEffect(() => {
    let active = true;
    listWorkspaceProjects(session.accessToken)
      .then(async (projects) => {
        if (!active) {
          return;
        }
        const projectId = projects[0]?.id ?? "";
        if (!projectId) {
          setState({ projects: [], features: [], tasks: [] });
          setSelectedProjectId("");
          return;
        }
        const [features, tasks] = await Promise.all([
          listWorkspaceFeatures(projectId, session.accessToken),
          listWorkspaceTasks(projectId, session.accessToken)
        ]);
        if (!active) {
          return;
        }
        setState({ projects, features, tasks });
        setSelectedProjectId(projectId);
        setError("");
      })
      .catch((reason) => {
        if (active) {
          setState({ projects: [], features: [], tasks: [] });
          setError(reason instanceof Error ? reason.message : "Workspace API unavailable");
        }
      });

    return () => {
      active = false;
    };
  }, [session.accessToken, session.mode]);

  const selectedProject = state.projects.find((project) => project.id === selectedProjectId);
  const features = useMemo(
    () => state.features.filter((feature) => feature.projectId === selectedProjectId),
    [selectedProjectId, state.features]
  );
  const tasks = useMemo(
    () => state.tasks.filter((task) => task.projectId === selectedProjectId),
    [selectedProjectId, state.tasks]
  );

  async function createProject(input: {
    name: string;
    codename: string;
    description?: string;
    priority: Priority;
  }) {
    const project = await createWorkspaceProject(input, session.accessToken);
    setState((current) => ({ ...current, projects: [...current.projects, project] }));
    setSelectedProjectId(project.id);
    notifyMissionDataChanged();
  }

  async function createFeature(input: {
    title: string;
    description?: string;
    priority: Priority;
  }) {
    if (!selectedProjectId) {
      return;
    }
    const feature = await createWorkspaceFeature(selectedProjectId, input, session.accessToken);
    setState((current) => ({ ...current, features: [...current.features, feature] }));
    notifyMissionDataChanged();
  }

  async function createTask(input: {
    title: string;
    featureId?: string;
    priority: Priority;
    estimateMinutes: number;
  }) {
    if (!selectedProjectId) {
      return;
    }
    const task = await createWorkspaceTask(
      selectedProjectId,
      {
        title: input.title,
        feature_id: input.featureId,
        priority: input.priority,
        estimate_minutes: input.estimateMinutes
      },
      session.accessToken
    );
    setState((current) => ({ ...current, tasks: [...current.tasks, task] }));
    await refreshApiProject(selectedProjectId);
    notifyMissionDataChanged();
  }

  async function setTaskStatus(taskId: string, status: WorkStatus) {
    const task = await updateWorkspaceTask(taskId, { status }, session.accessToken);
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === task.id ? task : item))
    }));
    await refreshApiProject(task.projectId);
    notifyMissionDataChanged();
  }

  return {
    mode,
    error,
    projects: state.projects,
    selectedProject,
    selectedProjectId,
    features,
    tasks,
    selectProject: setSelectedProjectId,
    createProject,
    createFeature,
    createTask,
    setTaskStatus
  };
}
