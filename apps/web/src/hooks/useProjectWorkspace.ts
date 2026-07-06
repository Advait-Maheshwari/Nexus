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
import type { Priority, WorkStatus } from "@/types/domain";
import type { WorkspaceFeature, WorkspaceProject, WorkspaceTask } from "@/types/workspace";

const STORAGE_KEY = "nexus.workspace.v1";

interface LocalState {
  projects: WorkspaceProject[];
  features: WorkspaceFeature[];
  tasks: WorkspaceTask[];
}

const initialLocalState: LocalState = {
  projects: [
    {
      id: "local-nexus",
      name: "Nexus",
      codename: "ORION",
      description: "Zero-cost cinematic project management system.",
      status: "in_progress",
      priority: "critical",
      healthScore: 88,
      progress: 50
    }
  ],
  features: [
    {
      id: "local-feature-core",
      projectId: "local-nexus",
      title: "Core Spine",
      status: "in_progress",
      priority: "critical",
      progress: 66,
      taskCount: 3,
      blockedTaskCount: 0
    },
    {
      id: "local-feature-galaxy",
      projectId: "local-nexus",
      title: "Galaxy View",
      status: "in_progress",
      priority: "high",
      progress: 42,
      taskCount: 2,
      blockedTaskCount: 0
    }
  ],
  tasks: [
    {
      id: "local-task-projects",
      projectId: "local-nexus",
      featureId: "local-feature-core",
      title: "Project CRUD workflow",
      status: "done",
      priority: "critical",
      estimateMinutes: 90,
      timeSpentMinutes: 70
    },
    {
      id: "local-task-features",
      projectId: "local-nexus",
      featureId: "local-feature-core",
      title: "Feature and task forms",
      status: "in_progress",
      priority: "high",
      estimateMinutes: 100,
      timeSpentMinutes: 45
    },
    {
      id: "local-task-galaxy",
      projectId: "local-nexus",
      featureId: "local-feature-galaxy",
      title: "Interactive planet selection",
      status: "ready",
      priority: "high",
      estimateMinutes: 120,
      timeSpentMinutes: 30
    }
  ]
};

export function useProjectWorkspace() {
  const [state, setState] = useState<LocalState>(() => loadLocalState());
  const [selectedProjectId, setSelectedProjectId] = useState(state.projects[0]?.id ?? "");
  const [mode, setMode] = useState<"api" | "local">("local");

  const refreshApiProject = useCallback(async (projectId: string) => {
    const [features, tasks] = await Promise.all([
      listWorkspaceFeatures(projectId),
      listWorkspaceTasks(projectId)
    ]);
    setState((current) => ({ ...current, features, tasks }));
  }, []);

  useEffect(() => {
    let active = true;
    listWorkspaceProjects()
      .then(async (projects) => {
        if (!active || projects.length === 0) {
          return;
        }
        const projectId = projects[0].id;
        const [features, tasks] = await Promise.all([
          listWorkspaceFeatures(projectId),
          listWorkspaceTasks(projectId)
        ]);
        if (!active) {
          return;
        }
        setState({ projects, features, tasks });
        setSelectedProjectId(projectId);
        setMode("api");
      })
      .catch(() => setMode("local"));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (mode === "local") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [mode, state]);

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
    if (mode === "api") {
      const project = await createWorkspaceProject(input);
      setState((current) => ({ ...current, projects: [...current.projects, project] }));
      setSelectedProjectId(project.id);
      return;
    }

    const project: WorkspaceProject = {
      id: crypto.randomUUID(),
      name: input.name,
      codename: input.codename,
      description: input.description,
      status: "backlog",
      priority: input.priority,
      healthScore: 100,
      progress: 0
    };
    setState((current) => ({ ...current, projects: [...current.projects, project] }));
    setSelectedProjectId(project.id);
  }

  async function createFeature(input: {
    title: string;
    description?: string;
    priority: Priority;
  }) {
    if (!selectedProjectId) {
      return;
    }
    if (mode === "api") {
      const feature = await createWorkspaceFeature(selectedProjectId, input);
      setState((current) => ({ ...current, features: [...current.features, feature] }));
      return;
    }

    const feature: WorkspaceFeature = {
      id: crypto.randomUUID(),
      projectId: selectedProjectId,
      title: input.title,
      description: input.description,
      status: "backlog",
      priority: input.priority,
      progress: 0,
      taskCount: 0,
      blockedTaskCount: 0
    };
    setState((current) => ({ ...current, features: [...current.features, feature] }));
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
    if (mode === "api") {
      const task = await createWorkspaceTask(selectedProjectId, {
        title: input.title,
        feature_id: input.featureId,
        priority: input.priority,
        estimate_minutes: input.estimateMinutes
      });
      setState((current) => ({ ...current, tasks: [...current.tasks, task] }));
      await refreshApiProject(selectedProjectId);
      return;
    }

    const task: WorkspaceTask = {
      id: crypto.randomUUID(),
      projectId: selectedProjectId,
      featureId: input.featureId,
      title: input.title,
      status: "backlog",
      priority: input.priority,
      estimateMinutes: input.estimateMinutes,
      timeSpentMinutes: 0
    };
    setState((current) => ({ ...current, tasks: [...current.tasks, task] }));
  }

  async function setTaskStatus(taskId: string, status: WorkStatus) {
    if (mode === "api") {
      const task = await updateWorkspaceTask(taskId, { status });
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((item) => (item.id === task.id ? task : item))
      }));
      await refreshApiProject(task.projectId);
      return;
    }

    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
    }));
  }

  return {
    mode,
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

function loadLocalState(): LocalState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as LocalState) : initialLocalState;
  } catch {
    return initialLocalState;
  }
}

