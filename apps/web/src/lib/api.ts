import { missionData } from "@/data/nexusSeed";
import type { MissionData, ProjectSummary } from "@/types/domain";
import type { WorkspaceFeature, WorkspaceProject, WorkspaceTask } from "@/types/workspace";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface ApiProjectSummary {
  id: string;
  name: string;
  codename: string;
  status: ProjectSummary["status"];
  health: ProjectSummary["health"];
  health_score: number;
  progress: number;
  priority: ProjectSummary["priority"];
  deadline?: string | null;
  time_spent_minutes: number;
  velocity: number;
  feature_count: number;
  task_count: number;
  blocked_task_count: number;
}

interface ApiRecommendation {
  title: string;
  body: string;
  confidence: number;
  action_label: string;
}

interface ApiMissionControl {
  metrics: MissionData["metrics"];
  projects: ApiProjectSummary[];
  today_mission: string[];
  ai_recommendations: ApiRecommendation[];
  activity: string[];
}

export async function fetchMissionControl(): Promise<MissionData> {
  const response = await fetch(`${API_URL}/api/v1/mission-control`);

  if (!response.ok) {
    throw new Error(`Mission Control API failed with ${response.status}`);
  }

  const payload = (await response.json()) as ApiMissionControl;
  const projects = payload.projects.map((project, index) => mergeProject(project, index));

  return {
    ...missionData,
    metrics: payload.metrics,
    projects,
    todayMission: payload.today_mission,
    aiRecommendations: payload.ai_recommendations.map((recommendation) => ({
      title: recommendation.title,
      body: recommendation.body,
      confidence: recommendation.confidence,
      actionLabel: recommendation.action_label
    })),
    activity: payload.activity
  };
}

export async function listWorkspaceProjects(): Promise<WorkspaceProject[]> {
  const response = await fetch(`${API_URL}/api/v1/projects`);
  if (!response.ok) {
    throw new Error(`Projects API failed with ${response.status}`);
  }

  const projects = (await response.json()) as Array<{
    id: string;
    name: string;
    codename: string;
    description?: string | null;
    status: WorkspaceProject["status"];
    priority: WorkspaceProject["priority"];
    health_score: number;
    progress: number;
    deadline?: string | null;
  }>;

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    codename: project.codename,
    description: project.description ?? undefined,
    status: project.status,
    priority: project.priority,
    healthScore: project.health_score,
    progress: project.progress,
    deadline: project.deadline ?? undefined
  }));
}

export async function createWorkspaceProject(input: {
  name: string;
  codename: string;
  description?: string;
  priority: WorkspaceProject["priority"];
}): Promise<WorkspaceProject> {
  const response = await fetch(`${API_URL}/api/v1/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(`Create project failed with ${response.status}`);
  }

  const project = (await response.json()) as {
    id: string;
    name: string;
    codename: string;
    description?: string | null;
    status: WorkspaceProject["status"];
    priority: WorkspaceProject["priority"];
    health_score: number;
    progress: number;
    deadline?: string | null;
  };

  return {
    id: project.id,
    name: project.name,
    codename: project.codename,
    description: project.description ?? undefined,
    status: project.status,
    priority: project.priority,
    healthScore: project.health_score,
    progress: project.progress,
    deadline: project.deadline ?? undefined
  };
}

export async function listWorkspaceFeatures(projectId: string): Promise<WorkspaceFeature[]> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/features`);
  if (!response.ok) {
    throw new Error(`Features API failed with ${response.status}`);
  }

  const features = (await response.json()) as Array<{
    id: string;
    project_id: string;
    title: string;
    description?: string | null;
    status: WorkspaceFeature["status"];
    priority: WorkspaceFeature["priority"];
    progress: number;
    task_count: number;
    blocked_task_count: number;
  }>;

  return features.map((feature) => ({
    id: feature.id,
    projectId: feature.project_id,
    title: feature.title,
    description: feature.description ?? undefined,
    status: feature.status,
    priority: feature.priority,
    progress: feature.progress,
    taskCount: feature.task_count,
    blockedTaskCount: feature.blocked_task_count
  }));
}

export async function createWorkspaceFeature(
  projectId: string,
  input: { title: string; description?: string; priority: WorkspaceFeature["priority"] }
): Promise<WorkspaceFeature> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/features`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(`Create feature failed with ${response.status}`);
  }

  const feature = (await response.json()) as {
    id: string;
    project_id: string;
    title: string;
    description?: string | null;
    status: WorkspaceFeature["status"];
    priority: WorkspaceFeature["priority"];
    progress: number;
    task_count: number;
    blocked_task_count: number;
  };

  return {
    id: feature.id,
    projectId: feature.project_id,
    title: feature.title,
    description: feature.description ?? undefined,
    status: feature.status,
    priority: feature.priority,
    progress: feature.progress,
    taskCount: feature.task_count,
    blockedTaskCount: feature.blocked_task_count
  };
}

export async function listWorkspaceTasks(projectId: string): Promise<WorkspaceTask[]> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/tasks`);
  if (!response.ok) {
    throw new Error(`Tasks API failed with ${response.status}`);
  }

  const tasks = (await response.json()) as Array<{
    id: string;
    project_id: string;
    feature_id?: string | null;
    parent_task_id?: string | null;
    title: string;
    description?: string | null;
    status: WorkspaceTask["status"];
    priority: WorkspaceTask["priority"];
    estimate_minutes: number;
    time_spent_minutes: number;
    due_date?: string | null;
    blocked_reason?: string | null;
  }>;

  return tasks.map(mapTask);
}

export async function createWorkspaceTask(
  projectId: string,
  input: {
    title: string;
    description?: string;
    feature_id?: string;
    priority: WorkspaceTask["priority"];
    estimate_minutes: number;
  }
): Promise<WorkspaceTask> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(`Create task failed with ${response.status}`);
  }
  return mapTask(await response.json());
}

export async function updateWorkspaceTask(
  taskId: string,
  input: Partial<{
    status: WorkspaceTask["status"];
    title: string;
    priority: WorkspaceTask["priority"];
    time_spent_minutes: number;
  }>
): Promise<WorkspaceTask> {
  const response = await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(`Update task failed with ${response.status}`);
  }
  return mapTask(await response.json());
}

function mapTask(task: {
  id: string;
  project_id: string;
  feature_id?: string | null;
  parent_task_id?: string | null;
  title: string;
  description?: string | null;
  status: WorkspaceTask["status"];
  priority: WorkspaceTask["priority"];
  estimate_minutes: number;
  time_spent_minutes: number;
  due_date?: string | null;
  blocked_reason?: string | null;
}): WorkspaceTask {
  return {
    id: task.id,
    projectId: task.project_id,
    featureId: task.feature_id ?? undefined,
    parentTaskId: task.parent_task_id ?? undefined,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority,
    estimateMinutes: task.estimate_minutes,
    timeSpentMinutes: task.time_spent_minutes,
    dueDate: task.due_date ?? undefined,
    blockedReason: task.blocked_reason ?? undefined
  };
}

function mergeProject(project: ApiProjectSummary, index: number): ProjectSummary {
  const visualSeed =
    missionData.projects.find((item) => item.codename === project.codename) ??
    missionData.projects[index % missionData.projects.length];

  return {
    ...visualSeed,
    name: project.name,
    codename: project.codename,
    status: project.status,
    health: project.health,
    healthScore: project.health_score,
    progress: project.progress,
    priority: project.priority,
    deadline: project.deadline ?? undefined,
    timeSpentMinutes: project.time_spent_minutes,
    velocity: project.velocity,
    featureCount: project.feature_count,
    taskCount: project.task_count,
    blockedTaskCount: project.blocked_task_count
  };
}
