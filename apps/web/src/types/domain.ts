import type { Priority, ProjectHealth, WorkStatus } from "@nexus/shared";

export type { Priority, ProjectHealth, WorkStatus };

export interface Metric {
  label: string;
  value: string;
  delta: string;
  tone: "cyan" | "green" | "gold" | "red" | "violet";
}

export interface ProjectSummary {
  id: string;
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
  coordinates: [number, number, number];
  accent: string;
  planets: FeaturePlanet[];
}

export interface FeaturePlanet {
  id: string;
  name: string;
  status: WorkStatus;
  progress: number;
  taskCount: number;
  blockedTaskCount: number;
  orbitRadius: number;
}

export interface ProjectRelationship {
  id: string;
  sourceProjectId: string;
  targetProjectId: string;
  type: "dependency" | "shared-ai" | "shared-deadline" | "inspiration";
  strength: number;
  label: string;
}

export interface TimelineNode {
  id: string;
  label: string;
  type: "milestone" | "task" | "feature" | "event";
  status: WorkStatus;
  date: string;
}

export interface Recommendation {
  title: string;
  body: string;
  confidence: number;
  actionLabel: string;
}

export interface MissionData {
  metrics: Metric[];
  projects: ProjectSummary[];
  relationships: ProjectRelationship[];
  todayMission: string[];
  aiRecommendations: Recommendation[];
  activity: string[];
  timeline: TimelineNode[];
}
