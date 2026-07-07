export interface ProjectGoal {
  id: string;
  title: string;
  measure: string;
  completed: boolean;
}

export interface ProjectStep {
  id: string;
  title: string;
  guidance: string;
  status: "pending" | "active" | "done";
  priority: "low" | "medium" | "high" | "critical";
}

export interface ProjectBlueprint {
  projectId: string;
  vision: string;
  definitionOfDone: string;
  strategy: string;
  constraints: string[];
  goals: ProjectGoal[];
  steps: ProjectStep[];
  updatedAt: string;
}
