import type { WorkStatus } from "@/types/domain";

export interface PlanningProject {
  id: string;
  name: string;
  codename: string;
}

export interface ProjectIdea {
  id: string;
  projectId: string;
  title: string;
  body?: string;
  score: number;
  source?: string;
  createdAt: string;
}

export interface JournalRecord {
  id: string;
  projectId: string;
  title: string;
  body: string;
  mood?: string;
  summary?: string;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: WorkStatus;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}
