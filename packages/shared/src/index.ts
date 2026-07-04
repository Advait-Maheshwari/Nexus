export type Priority = "low" | "medium" | "high" | "critical";
export type WorkStatus = "backlog" | "ready" | "in_progress" | "blocked" | "done" | "archived";
export type ProjectHealth = "excellent" | "stable" | "at_risk" | "critical";

export interface NexusEntity {
  id: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends NexusEntity {
  name: string;
  codename: string;
  status: WorkStatus;
  health: ProjectHealth;
  healthScore: number;
  progress: number;
  priority: Priority;
  deadline?: string;
  timeSpentMinutes: number;
  velocity: number;
  featureCount: number;
  taskCount: number;
  blockedTaskCount: number;
}

