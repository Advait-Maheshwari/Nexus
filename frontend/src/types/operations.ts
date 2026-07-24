export type BriefingType = "daily" | "weekly";
export type AutomationCadence = "daily" | "weekly";

export interface BriefingContent {
  headline: string;
  focus: string;
  nextTask: string;
  bottleneck: string;
  healthNarrative: string;
  actionPlan: string[];
  projectCount: number;
  riskCount: number;
  blockedTaskCount: number;
  teamHeadline: string;
}

export interface BriefingSnapshot {
  id: string;
  briefingType: BriefingType;
  periodKey: string;
  provider: string;
  content: BriefingContent;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  briefingType: BriefingType;
  cadence: AutomationCadence;
  enabled: boolean;
  maxRunsPerPeriod: number;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationPreview {
  ruleId: string;
  periodKey: string;
  due: boolean;
  wouldCreateSnapshot: boolean;
  reason: string;
  actionSummary: string;
}

export interface AutomationRun {
  id: string;
  ruleId: string;
  mode: "execute";
  status: "completed" | "skipped";
  periodKey: string;
  outputSnapshotId?: string;
  decision: Record<string, unknown>;
  createdAt: string;
}

export interface AIProviderStatus {
  provider: "local" | "openai" | "anthropic" | "google";
  label: string;
  configured: boolean;
  enabled: boolean;
  executionMode: "active" | "disabled";
  detail: string;
}

export interface OperationsOverview {
  snapshots: BriefingSnapshot[];
  rules: AutomationRule[];
  recentRuns: AutomationRun[];
  providers: AIProviderStatus[];
}
