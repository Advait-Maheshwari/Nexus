export interface ProjectGoal {
  id: string;
  title: string;
  completed: boolean;
}

export interface ProjectStep {
  id: string;
  title: string;
  status: "pending" | "active" | "done";
}

export interface ProjectBlueprint {
  projectId: string;
  vision: string;
  definitionOfDone: string;
  goals: ProjectGoal[];
  steps: ProjectStep[];
  updatedAt: string;
}
