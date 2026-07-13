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
import type { NexusSession } from "@/types/auth";
import type { WorkspaceFeature, WorkspaceProject, WorkspaceTask } from "@/types/workspace";

const STORAGE_KEY = "nexus.workspace.v2";

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
      description:
        "Build Nexus into a zero-cost, production-grade, futuristic 3D AI-powered project management system that works first for personal use and can grow into SaaS without a rewrite.",
      status: "in_progress",
      priority: "critical",
      healthScore: 84,
      progress: 58
    }
  ],
  features: [
    {
      id: "local-feature-foundation",
      projectId: "local-nexus",
      title: "Phase 1: Core Spine",
      description: "Architecture, monorepo, core models, auth base, CRUD spine, and zero-cost policy.",
      status: "done",
      priority: "critical",
      progress: 100,
      taskCount: 4,
      blockedTaskCount: 0
    },
    {
      id: "local-feature-3d-os",
      projectId: "local-nexus",
      title: "Phase 2: 3D Command OS",
      description: "Mission Control, Galaxy/Solar, City Builder, Analytics, and cinematic project views.",
      status: "done",
      priority: "high",
      progress: 100,
      taskCount: 5,
      blockedTaskCount: 0
    },
    {
      id: "local-feature-integrations",
      projectId: "local-nexus",
      title: "Phase 3: Free Integrations",
      description: "GitHub, calendar exports, Notion/Slack/Discord templates, and local zero-cost workflows.",
      status: "done",
      priority: "high",
      progress: 100,
      taskCount: 4,
      blockedTaskCount: 0
    },
    {
      id: "local-feature-cloud-security",
      projectId: "local-nexus",
      title: "Phase 4: Cloud, Auth, and Security",
      description: "Render, Neon, Firebase, JWT security, role permissions, session validation, and account safety.",
      status: "in_progress",
      priority: "critical",
      progress: 46,
      taskCount: 6,
      blockedTaskCount: 2
    },
    {
      id: "local-feature-saas-launch",
      projectId: "local-nexus",
      title: "Phase 5: SaaS Launch Readiness",
      description: "Workspace collaboration, onboarding, monitoring, backup/restore, responsive QA, and launch checklist.",
      status: "backlog",
      priority: "critical",
      progress: 18,
      taskCount: 5,
      blockedTaskCount: 1
    }
  ],
  tasks: [
    {
      id: "local-task-zero-cost",
      projectId: "local-nexus",
      featureId: "local-feature-foundation",
      title: "Lock zero-cost policy from Phase 1 through launch",
      status: "done",
      priority: "critical",
      estimateMinutes: 90,
      timeSpentMinutes: 90
    },
    {
      id: "local-task-architecture",
      projectId: "local-nexus",
      featureId: "local-feature-foundation",
      title: "Create scalable full-stack architecture for future SaaS",
      status: "done",
      priority: "critical",
      estimateMinutes: 180,
      timeSpentMinutes: 170
    },
    {
      id: "local-task-galaxy-fix",
      projectId: "local-nexus",
      featureId: "local-feature-3d-os",
      title: "Make Galaxy/Solar readable, semantic, and not over-zoomed",
      status: "done",
      priority: "high",
      estimateMinutes: 150,
      timeSpentMinutes: 145
    },
    {
      id: "local-task-city-builder",
      projectId: "local-nexus",
      featureId: "local-feature-3d-os",
      title: "Upgrade City Builder into a detailed project city",
      status: "done",
      priority: "high",
      estimateMinutes: 160,
      timeSpentMinutes: 155
    },
    {
      id: "local-task-render-neon",
      projectId: "local-nexus",
      featureId: "local-feature-cloud-security",
      title: "Verify Render API and Neon database live signup/project sync",
      status: "done",
      priority: "critical",
      estimateMinutes: 120,
      timeSpentMinutes: 80
    },
    {
      id: "local-task-session-validation",
      projectId: "local-nexus",
      featureId: "local-feature-cloud-security",
      title: "Add current-session verification and safer stored-session handling",
      status: "in_progress",
      priority: "critical",
      estimateMinutes: 140,
      timeSpentMinutes: 20
    },
    {
      id: "local-task-account-recovery",
      projectId: "local-nexus",
      featureId: "local-feature-cloud-security",
      title: "Design password reset, session revocation, and recovery flow",
      status: "ready",
      priority: "critical",
      estimateMinutes: 160,
      timeSpentMinutes: 0
    },
    {
      id: "local-task-launch-checklist",
      projectId: "local-nexus",
      featureId: "local-feature-saas-launch",
      title: "Create final SaaS launch checklist and production readiness gate",
      status: "backlog",
      priority: "high",
      estimateMinutes: 180,
      timeSpentMinutes: 0
    }
  ]
};

export function useProjectWorkspace(session: NexusSession) {
  const storageKey = `${STORAGE_KEY}.${session.workspaceId}`;
  const [state, setState] = useState<LocalState>(() => loadLocalState(storageKey));
  const [selectedProjectId, setSelectedProjectId] = useState(state.projects[0]?.id ?? "");
  const [mode, setMode] = useState<"api" | "local">("local");
  const [error, setError] = useState("");

  const refreshApiProject = useCallback(async (projectId: string) => {
    const [features, tasks] = await Promise.all([
      listWorkspaceFeatures(projectId, session.accessToken),
      listWorkspaceTasks(projectId, session.accessToken)
    ]);
    setState((current) => ({ ...current, features, tasks }));
  }, [session.accessToken]);

  useEffect(() => {
    if (session.mode !== "api") {
      setMode("local");
      return;
    }
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
          setMode("api");
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
        setMode("api");
        setError("");
      })
      .catch((reason) => {
        if (active) {
          setMode("api");
          setState({ projects: [], features: [], tasks: [] });
          setError(reason instanceof Error ? reason.message : "Workspace API unavailable");
        }
      });

    return () => {
      active = false;
    };
  }, [session.accessToken, session.mode]);

  useEffect(() => {
    if (mode === "local") {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [mode, state, storageKey]);

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
      const project = await createWorkspaceProject(input, session.accessToken);
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
      const feature = await createWorkspaceFeature(selectedProjectId, input, session.accessToken);
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
      const task = await updateWorkspaceTask(taskId, { status }, session.accessToken);
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

function loadLocalState(storageKey: string): LocalState {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as LocalState) : initialLocalState;
  } catch {
    return initialLocalState;
  }
}
