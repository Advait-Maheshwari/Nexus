import { missionData } from "@/data/nexusSeed";
import type { MissionData, ProjectSummary } from "@/types/domain";

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

