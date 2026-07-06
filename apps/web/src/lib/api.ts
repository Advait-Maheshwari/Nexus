import { missionData } from "@/data/nexusSeed";
import type { MissionData, ProjectSummary } from "@/types/domain";
import type { NexusSession } from "@/types/auth";
import type { GitHubRepositoryActivity } from "@/types/integrations";
import type { WorkspaceFeature, WorkspaceProject, WorkspaceTask } from "@/types/workspace";
import type {
  JournalRecord,
  ProjectIdea,
  ProjectMilestone
} from "@/types/planning";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function authenticate(
  mode: "login" | "register",
  input: { email: string; password: string; fullName?: string }
): Promise<NexusSession> {
  const response = await fetch(`${API_URL}/api/v1/auth/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      ...(mode === "register" ? { full_name: input.fullName } : {})
    })
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Authentication failed"));
  }

  const payload = (await response.json()) as {
    access_token: string;
    user_id: string;
    workspace_id: string;
  };
  return {
    accessToken: payload.access_token,
    userId: payload.user_id,
    workspaceId: payload.workspace_id,
    mode: "api"
  };
}

export async function exchangeFirebaseToken(idToken: string): Promise<NexusSession> {
  const response = await fetch(`${API_URL}/api/v1/auth/firebase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken })
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Cloud synchronization is unavailable"));
  }
  const payload = (await response.json()) as {
    access_token: string;
    user_id: string;
    workspace_id: string;
  };
  return {
    accessToken: payload.access_token,
    userId: payload.user_id,
    workspaceId: payload.workspace_id,
    mode: "api"
  };
}

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

export async function fetchGitHubActivity(
  owner: string,
  repo: string
): Promise<GitHubRepositoryActivity> {
  const response = await fetch(
    `${API_URL}/api/v1/integrations/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/activity`
  );
  if (!response.ok) {
    throw new Error(`GitHub integration failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    repository: string;
    commits: Array<{
      sha: string;
      message: string;
      author: string;
      committed_at: string;
      url: string;
      verified: boolean;
    }>;
    rate_limit_remaining?: number | null;
    authenticated: boolean;
  };

  return {
    repository: payload.repository,
    commits: payload.commits.map((commit) => ({
      sha: commit.sha,
      message: commit.message,
      author: commit.author,
      committedAt: commit.committed_at,
      url: commit.url,
      verified: commit.verified
    })),
    rateLimitRemaining: payload.rate_limit_remaining ?? undefined,
    authenticated: payload.authenticated,
    source: "github"
  };
}

export async function listWorkspaceProjects(accessToken: string): Promise<WorkspaceProject[]> {
  const response = await fetch(`${API_URL}/api/v1/projects`, {
    headers: authHeaders(accessToken)
  });
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
}, accessToken: string): Promise<WorkspaceProject> {
  const response = await fetch(`${API_URL}/api/v1/projects`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
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

export async function listWorkspaceFeatures(
  projectId: string,
  accessToken: string
): Promise<WorkspaceFeature[]> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/features`, {
    headers: authHeaders(accessToken)
  });
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
  input: { title: string; description?: string; priority: WorkspaceFeature["priority"] },
  accessToken: string
): Promise<WorkspaceFeature> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/features`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
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

export async function listWorkspaceTasks(
  projectId: string,
  accessToken: string
): Promise<WorkspaceTask[]> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/tasks`, {
    headers: authHeaders(accessToken)
  });
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
  },
  accessToken: string
): Promise<WorkspaceTask> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/tasks`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
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
  }>,
  accessToken: string
): Promise<WorkspaceTask> {
  const response = await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(`Update task failed with ${response.status}`);
  }
  return mapTask(await response.json());
}

export async function listIdeas(accessToken: string): Promise<ProjectIdea[]> {
  const response = await fetch(`${API_URL}/api/v1/ideas`, {
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await apiError(response, "Ideas API failed"));
  return ((await response.json()) as ApiIdea[]).map(mapIdea);
}

export async function createIdea(
  projectId: string,
  input: { title: string; body?: string; score: number; source?: string },
  accessToken: string
): Promise<ProjectIdea> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/ideas`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error(await apiError(response, "Create idea failed"));
  return mapIdea((await response.json()) as ApiIdea);
}

export async function listJournal(accessToken: string): Promise<JournalRecord[]> {
  const response = await fetch(`${API_URL}/api/v1/journal`, {
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await apiError(response, "Journal API failed"));
  return ((await response.json()) as ApiJournal[]).map(mapJournal);
}

export async function createJournalEntry(
  projectId: string,
  input: { title: string; body: string; mood?: string },
  accessToken: string
): Promise<JournalRecord> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/journal`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error(await apiError(response, "Create journal entry failed"));
  return mapJournal((await response.json()) as ApiJournal);
}

export async function listMilestones(accessToken: string): Promise<ProjectMilestone[]> {
  const response = await fetch(`${API_URL}/api/v1/milestones`, {
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await apiError(response, "Milestones API failed"));
  return ((await response.json()) as ApiMilestone[]).map(mapMilestone);
}

export async function createMilestone(
  projectId: string,
  input: { title: string; description?: string; due_date?: string },
  accessToken: string
): Promise<ProjectMilestone> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/milestones`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error(await apiError(response, "Create milestone failed"));
  return mapMilestone((await response.json()) as ApiMilestone);
}

export async function updateMilestone(
  milestoneId: string,
  input: { status: ProjectMilestone["status"] },
  accessToken: string
): Promise<ProjectMilestone> {
  const response = await fetch(`${API_URL}/api/v1/milestones/${milestoneId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error(await apiError(response, "Update milestone failed"));
  return mapMilestone((await response.json()) as ApiMilestone);
}

interface ApiIdea {
  id: string;
  project_id: string;
  title: string;
  body?: string | null;
  score: number;
  source?: string | null;
  created_at: string;
}

interface ApiJournal {
  id: string;
  project_id: string;
  title: string;
  body: string;
  mood?: string | null;
  summary?: string | null;
  created_at: string;
}

interface ApiMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: ProjectMilestone["status"];
  due_date?: string | null;
  completed_at?: string | null;
  created_at: string;
}

function mapIdea(item: ApiIdea): ProjectIdea {
  return {
    id: item.id,
    projectId: item.project_id,
    title: item.title,
    body: item.body ?? undefined,
    score: item.score,
    source: item.source ?? undefined,
    createdAt: item.created_at
  };
}

function mapJournal(item: ApiJournal): JournalRecord {
  return {
    id: item.id,
    projectId: item.project_id,
    title: item.title,
    body: item.body,
    mood: item.mood ?? undefined,
    summary: item.summary ?? undefined,
    createdAt: item.created_at
  };
}

function mapMilestone(item: ApiMilestone): ProjectMilestone {
  return {
    id: item.id,
    projectId: item.project_id,
    title: item.title,
    description: item.description ?? undefined,
    status: item.status,
    dueDate: item.due_date ?? undefined,
    completedAt: item.completed_at ?? undefined,
    createdAt: item.created_at
  };
}

function authHeaders(accessToken: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {})
  };
}

async function apiError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { detail?: string | Array<{ msg?: string }> }
    | null;
  const detail = payload?.detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join(". ") || fallback;
  }
  return `${fallback} (${response.status})`;
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
