import type { Priority, WorkStatus } from "@/types/domain";

export interface WorkspaceProject {
  id: string;
  name: string;
  codename: string;
  description?: string;
  status: WorkStatus;
  priority: Priority;
  healthScore: number;
  progress: number;
  deadline?: string;
}

export interface WorkspaceFeature {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: WorkStatus;
  priority: Priority;
  progress: number;
  taskCount: number;
  blockedTaskCount: number;
}

export interface WorkspaceTask {
  id: string;
  projectId: string;
  featureId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  status: WorkStatus;
  priority: Priority;
  estimateMinutes: number;
  timeSpentMinutes: number;
  dueDate?: string;
  blockedReason?: string;
}

