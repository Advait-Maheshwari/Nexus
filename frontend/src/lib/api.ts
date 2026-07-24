import type { ProjectBlueprint } from "@/types/blueprint";
import type {
  ExecutionIntelligence,
  MissionData,
  ProjectSummary,
  TeamIntelligence
} from "@/types/domain";
import type { Preferences } from "@/types/preferences";
import type {
  NexusAccount,
  NexusRole,
  NexusSession,
  NexusWorkspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceUsage
} from "@/types/auth";
import type { GitHubRepositoryActivity } from "@/types/integrations";
import type {
  AutomationPreview,
  AutomationRule,
  AutomationRun,
  BriefingSnapshot,
  BriefingType,
  OperationsOverview
} from "@/types/operations";
import type { WorkspaceFeature, WorkspaceProject, WorkspaceTask } from "@/types/workspace";
import type {
  JournalRecord,
  ProjectIdea,
  ProjectMilestone
} from "@/types/planning";

const localApiUrl = `${window.location.protocol}//${window.location.hostname}:8001`;
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_URL = (configuredApiUrl || (import.meta.env.DEV ? localApiUrl : "")).replace(/\/$/, "");

if (!API_URL) {
  throw new Error("VITE_API_URL is required for production builds");
}

if (import.meta.env.PROD && new URL(API_URL).protocol !== "https:") {
  throw new Error("VITE_API_URL must use HTTPS in production");
}

export interface AuthActionResult {
  message: string;
  verificationRequired: boolean;
}

export async function authenticate(
  mode: "login" | "register",
  input: { email: string; password: string; fullName?: string }
): Promise<NexusSession | AuthActionResult> {
  const response = await fetch(`${API_URL}/api/v1/auth/${mode}`, {
    method: "POST",
    credentials: "include",
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

  const payload = (await response.json()) as ApiTokenPayload | ApiAuthActionPayload;
  if (!("access_token" in payload)) {
    return {
      message: payload.message,
      verificationRequired: payload.verification_required ?? false
    };
  }
  return sessionFromPayload(payload, "password");
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/v1/auth/password/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!response.ok) throw new Error(await apiError(response, "Password recovery failed"));
  return ((await response.json()) as ApiAuthActionPayload).message;
}

export async function resetAccountPassword(token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/auth/password/reset`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword })
  });
  if (!response.ok) throw new Error(await apiError(response, "Password reset failed"));
}

export async function verifyAccountEmail(token: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/auth/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  if (!response.ok) throw new Error(await apiError(response, "Email verification failed"));
}

export async function resendAccountVerification(email: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/v1/auth/email/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!response.ok) throw new Error(await apiError(response, "Verification request failed"));
  return ((await response.json()) as ApiAuthActionPayload).message;
}

export async function exchangeFirebaseToken(idToken: string): Promise<NexusSession> {
  const response = await fetch(`${API_URL}/api/v1/auth/firebase`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken })
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Cloud synchronization is unavailable"));
  }
  return sessionFromPayload(await response.json(), "google");
}

export async function validateSession(session: NexusSession): Promise<NexusSession> {
  if (session.mode !== "api") return session;

  let accessToken = session.accessToken;
  let response = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: authHeaders(accessToken),
    credentials: "include"
  });
  if (response.status === 401) {
    const refreshed = await refreshSession();
    accessToken = refreshed.accessToken;
    response = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: authHeaders(accessToken),
      credentials: "include"
    });
  }
  if (!response.ok) {
    throw new Error(await apiError(response, "Session validation failed"));
  }
  const account = mapAccount(await response.json());
  return mergeAccount(
    { ...session, accessToken, userId: account.userId, workspaceId: account.workspaceId },
    account
  );
}

export async function refreshSession(): Promise<NexusSession> {
  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Nexus-Session": "refresh" }
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Session refresh failed"));
  }
  return sessionFromPayload(await response.json());
}

export async function logoutSession(): Promise<void> {
  await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Nexus-Session": "logout" }
  });
}

export async function logoutAllSessions(accessToken: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/auth/logout-all`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await apiError(response, "Session revocation failed"));
}

export async function fetchAccount(accessToken: string): Promise<NexusAccount> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    credentials: "include",
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await apiError(response, "Account loading failed"));
  return mapAccount(await response.json());
}

export async function enterPrivateDemo(accessToken: string): Promise<NexusSession> {
  const response = await fetch(`${API_URL}/api/v1/auth/demo`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await apiError(response, "Private demo is unavailable"));
  return sessionFromPayload(await response.json());
}

export async function deleteAccount(
  accessToken: string,
  confirmation: string,
  currentPassword?: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({
      confirmation,
      ...(currentPassword ? { current_password: currentPassword } : {})
    })
  });
  if (!response.ok) throw new Error(await apiError(response, "Account deletion failed"));
}

export async function updateAccount(
  accessToken: string,
  fullName: string,
  avatarUrl?: string
): Promise<NexusAccount> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    method: "PATCH",
    credentials: "include",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({
      full_name: fullName,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {})
    })
  });
  if (!response.ok) throw new Error(await apiError(response, "Profile update failed"));
  return mapAccount(await response.json());
}

export async function changeAccountPassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/auth/password`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    })
  });
  if (!response.ok) throw new Error(await apiError(response, "Password update failed"));
}

export async function listWorkspaces(accessToken: string): Promise<NexusWorkspace[]> {
  const response = await fetch(`${API_URL}/api/v1/workspaces`, {
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await apiError(response, "Workspace loading failed"));
  return ((await response.json()) as ApiWorkspace[]).map(mapWorkspace);
}

export async function switchWorkspace(
  accessToken: string,
  workspaceId: string
): Promise<NexusSession> {
  const response = await fetch(`${API_URL}/api/v1/workspaces/switch`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({ workspace_id: workspaceId })
  });
  if (!response.ok) throw new Error(await apiError(response, "Workspace switch failed"));
  return sessionFromPayload(await response.json());
}

export async function fetchWorkspaceUsage(accessToken: string): Promise<WorkspaceUsage> {
  const response = await fetch(`${API_URL}/api/v1/workspaces/usage`, {
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await apiError(response, "Usage loading failed"));
  const payload = (await response.json()) as {
    plan_code: string;
    projects: number;
    project_limit: number;
    tasks: number;
    task_limit: number;
    members: number;
    member_limit: number;
  };
  return {
    planCode: payload.plan_code,
    projects: payload.projects,
    projectLimit: payload.project_limit,
    tasks: payload.tasks,
    taskLimit: payload.task_limit,
    members: payload.members,
    memberLimit: payload.member_limit
  };
}

export async function listWorkspaceMembers(accessToken: string): Promise<WorkspaceMember[]> {
  const response = await fetch(`${API_URL}/api/v1/workspaces/members`, {
    headers: authHeaders(accessToken)
  });
  if (!response.ok) throw new Error(await apiError(response, "Member loading failed"));
  return ((await response.json()) as Array<{
    user_id: string;
    full_name: string;
    email: string;
    role: NexusRole;
    joined_at: string;
  }>).map((member) => ({
    userId: member.user_id,
    fullName: member.full_name,
    email: member.email,
    role: member.role,
    joinedAt: member.joined_at
  }));
}

export async function createWorkspaceInvitation(
  accessToken: string,
  email: string,
  role: Exclude<NexusRole, "owner">
): Promise<WorkspaceInvitation> {
  const response = await fetch(`${API_URL}/api/v1/workspaces/invitations`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({ email, role })
  });
  if (!response.ok) throw new Error(await apiError(response, "Invitation creation failed"));
  return mapInvitation(await response.json());
}

export async function acceptWorkspaceInvitation(
  accessToken: string,
  inviteToken: string
): Promise<NexusWorkspace> {
  const response = await fetch(`${API_URL}/api/v1/workspaces/invitations/accept`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({ invite_token: inviteToken })
  });
  if (!response.ok) throw new Error(await apiError(response, "Invitation acceptance failed"));
  return mapWorkspace(await response.json());
}

export async function updateWorkspaceMemberRole(
  accessToken: string,
  userId: string,
  role: Exclude<NexusRole, "owner">
): Promise<WorkspaceMember> {
  const response = await fetch(`${API_URL}/api/v1/workspaces/members/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({ role })
  });
  if (!response.ok) throw new Error(await apiError(response, "Role update failed"));
  const member = (await response.json()) as {
    user_id: string;
    full_name: string;
    email: string;
    role: NexusRole;
    joined_at: string;
  };
  return {
    userId: member.user_id,
    fullName: member.full_name,
    email: member.email,
    role: member.role,
    joinedAt: member.joined_at
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

interface ApiExecutionIntelligence {
  generated_at: string;
  provider: string;
  headline: string;
  next_actions: Array<{
    task_id?: string | null;
    project_id?: string | null;
    project_name: string;
    title: string;
    reason: string;
    action_type: ExecutionIntelligence["nextActions"][number]["actionType"];
    priority: ProjectSummary["priority"];
    score: number;
    confidence: number;
    due_date?: string | null;
    dependency_count: number;
  }>;
  risk_signals: Array<{
    key: string;
    severity: ExecutionIntelligence["riskSignals"][number]["severity"];
    title: string;
    detail: string;
    project_id?: string | null;
    task_id?: string | null;
  }>;
  forecast: {
    status: ExecutionIntelligence["forecast"]["status"];
    schedule_confidence: number;
    completion_percent: number;
    remaining_minutes: number;
    overdue_tasks: number;
    blocked_tasks: number;
    summary: string;
  };
}

interface ApiTeamIntelligence {
  generated_at: string;
  provider: string;
  headline: string;
  total_teams: number;
  lagging_teams: number;
  unassigned_tasks: number;
  signals: Array<{
    project_id: string;
    project_name: string;
    team_id: string;
    team_name: string;
    lead: string;
    responsibility: string;
    state: TeamIntelligence["signals"][number]["state"];
    assigned_task_count: number;
    assigned_task_titles: string[];
    open_task_count: number;
    completed_task_count: number;
    blocked_task_count: number;
    overdue_task_count: number;
    remaining_minutes: number;
    completion_percent: number;
    capacity_score: number;
    recovery_action: string;
  }>;
}

interface ApiMissionControl {
  metrics: MissionData["metrics"];
  projects: ApiProjectSummary[];
  today_mission: string[];
  ai_recommendations: ApiRecommendation[];
  activity: string[];
  execution_intelligence?: ApiExecutionIntelligence;
  team_intelligence?: ApiTeamIntelligence;
}

export async function fetchMissionControl(accessToken: string): Promise<MissionData> {
  const response = await fetch(`${API_URL}/api/v1/mission-control`, {
    headers: authHeaders(accessToken)
  });

  if (!response.ok) {
    throw new Error(`Mission Control API failed with ${response.status}`);
  }

  const payload = (await response.json()) as ApiMissionControl;
  const projects = await Promise.all(
    payload.projects.map(async (project, index) => {
      const features = await listWorkspaceFeatures(project.id, accessToken).catch(() => []);
      return mergeProject(project, index, features);
    })
  );

  return {
    metrics: payload.metrics,
    projects,
    relationships: [],
    todayMission: payload.today_mission,
    aiRecommendations: payload.ai_recommendations.map((recommendation) => ({
      title: recommendation.title,
      body: recommendation.body,
      confidence: recommendation.confidence,
      actionLabel: recommendation.action_label
    })),
    activity: payload.activity,
    timeline: [],
    executionIntelligence: mapExecutionIntelligence(payload.execution_intelligence),
    teamIntelligence: mapTeamIntelligence(payload.team_intelligence)
  };
}

interface ApiBriefingSnapshot {
  id: string;
  briefing_type: BriefingType;
  period_key: string;
  provider: string;
  content: {
    headline: string;
    focus: string;
    next_task: string;
    bottleneck: string;
    health_narrative: string;
    action_plan: string[];
    project_count: number;
    risk_count: number;
    blocked_task_count: number;
    team_headline: string;
  };
  created_at: string;
  updated_at: string;
}

interface ApiAutomationRule {
  id: string;
  name: string;
  briefing_type: BriefingType;
  cadence: BriefingType;
  enabled: boolean;
  max_runs_per_period: number;
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiAutomationPreview {
  rule_id: string;
  period_key: string;
  due: boolean;
  would_create_snapshot: boolean;
  reason: string;
  action_summary: string;
}

interface ApiAutomationRun {
  id: string;
  rule_id: string;
  mode: "execute";
  status: "completed" | "skipped";
  period_key: string;
  output_snapshot_id?: string | null;
  decision: Record<string, unknown>;
  created_at: string;
}

interface ApiOperationsOverview {
  snapshots: ApiBriefingSnapshot[];
  rules: ApiAutomationRule[];
  recent_runs: ApiAutomationRun[];
  providers: Array<{
    provider: "local" | "openai" | "anthropic" | "google";
    label: string;
    configured: boolean;
    enabled: boolean;
    execution_mode: "active" | "disabled";
    detail: string;
  }>;
}

export async function fetchOperations(accessToken: string): Promise<OperationsOverview> {
  const response = await fetch(`${API_URL}/api/v1/operations`, {
    headers: authHeaders(accessToken)
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Operational intelligence failed to load"));
  }
  return mapOperations(await response.json());
}

export async function generateBriefingSnapshot(
  accessToken: string,
  briefingType: BriefingType,
  refreshExisting = false
): Promise<BriefingSnapshot> {
  const response = await fetch(`${API_URL}/api/v1/operations/briefings`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({
      briefing_type: briefingType,
      refresh_existing: refreshExisting
    })
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Briefing snapshot could not be generated"));
  }
  return mapBriefingSnapshot(await response.json());
}

export async function createAutomationRule(
  accessToken: string,
  input: { name: string; briefingType: BriefingType }
): Promise<AutomationRule> {
  const response = await fetch(`${API_URL}/api/v1/operations/automation-rules`, {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({
      name: input.name,
      briefing_type: input.briefingType,
      cadence: input.briefingType
    })
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Automation rule could not be created"));
  }
  return mapAutomationRule(await response.json());
}

export async function updateAutomationRule(
  accessToken: string,
  ruleId: string,
  input: { name?: string; enabled?: boolean }
): Promise<AutomationRule> {
  const response = await fetch(`${API_URL}/api/v1/operations/automation-rules/${ruleId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Automation rule could not be updated"));
  }
  return mapAutomationRule(await response.json());
}

export async function deleteAutomationRule(
  accessToken: string,
  ruleId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/operations/automation-rules/${ruleId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Automation rule could not be deleted"));
  }
}

export async function previewAutomationRule(
  accessToken: string,
  ruleId: string
): Promise<AutomationPreview> {
  const response = await fetch(
    `${API_URL}/api/v1/operations/automation-rules/${ruleId}/preview`,
    {
      method: "POST",
      headers: authHeaders(accessToken)
    }
  );
  if (!response.ok) {
    throw new Error(await apiError(response, "Automation preview failed"));
  }
  const payload = (await response.json()) as ApiAutomationPreview;
  return {
    ruleId: payload.rule_id,
    periodKey: payload.period_key,
    due: payload.due,
    wouldCreateSnapshot: payload.would_create_snapshot,
    reason: payload.reason,
    actionSummary: payload.action_summary
  };
}

export async function executeAutomationRule(
  accessToken: string,
  ruleId: string
): Promise<AutomationRun> {
  const response = await fetch(
    `${API_URL}/api/v1/operations/automation-rules/${ruleId}/execute`,
    {
      method: "POST",
      headers: authHeaders(accessToken, true),
      body: JSON.stringify({ confirm: true })
    }
  );
  if (!response.ok) {
    throw new Error(await apiError(response, "Automation execution failed"));
  }
  return mapAutomationRun(await response.json());
}

function mapOperations(payload: ApiOperationsOverview): OperationsOverview {
  return {
    snapshots: payload.snapshots.map(mapBriefingSnapshot),
    rules: payload.rules.map(mapAutomationRule),
    recentRuns: payload.recent_runs.map(mapAutomationRun),
    providers: payload.providers.map((provider) => ({
      provider: provider.provider,
      label: provider.label,
      configured: provider.configured,
      enabled: provider.enabled,
      executionMode: provider.execution_mode,
      detail: provider.detail
    }))
  };
}

function mapBriefingSnapshot(payload: ApiBriefingSnapshot): BriefingSnapshot {
  return {
    id: payload.id,
    briefingType: payload.briefing_type,
    periodKey: payload.period_key,
    provider: payload.provider,
    content: {
      headline: payload.content.headline,
      focus: payload.content.focus,
      nextTask: payload.content.next_task,
      bottleneck: payload.content.bottleneck,
      healthNarrative: payload.content.health_narrative,
      actionPlan: payload.content.action_plan,
      projectCount: payload.content.project_count,
      riskCount: payload.content.risk_count,
      blockedTaskCount: payload.content.blocked_task_count,
      teamHeadline: payload.content.team_headline
    },
    createdAt: payload.created_at,
    updatedAt: payload.updated_at
  };
}

function mapAutomationRule(payload: ApiAutomationRule): AutomationRule {
  return {
    id: payload.id,
    name: payload.name,
    briefingType: payload.briefing_type,
    cadence: payload.cadence,
    enabled: payload.enabled,
    maxRunsPerPeriod: payload.max_runs_per_period,
    lastRunAt: payload.last_run_at ?? undefined,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at
  };
}

function mapAutomationRun(payload: ApiAutomationRun): AutomationRun {
  return {
    id: payload.id,
    ruleId: payload.rule_id,
    mode: payload.mode,
    status: payload.status,
    periodKey: payload.period_key,
    outputSnapshotId: payload.output_snapshot_id ?? undefined,
    decision: payload.decision,
    createdAt: payload.created_at
  };
}

function mapExecutionIntelligence(
  payload?: ApiExecutionIntelligence
): ExecutionIntelligence {
  if (!payload) {
    return {
      generatedAt: "",
      provider: "nexus_local_heuristic_v1",
      headline: "Execution intelligence is synchronizing with the Nexus API.",
      nextActions: [],
      riskSignals: [],
      forecast: {
        status: "empty",
        scheduleConfidence: 0,
        completionPercent: 0,
        remainingMinutes: 0,
        overdueTasks: 0,
        blockedTasks: 0,
        summary: "Live forecasting will appear after the API update is available."
      }
    };
  }

  return {
    generatedAt: payload.generated_at,
    provider: payload.provider,
    headline: payload.headline,
    nextActions: payload.next_actions.map((action) => ({
      taskId: action.task_id ?? undefined,
      projectId: action.project_id ?? undefined,
      projectName: action.project_name,
      title: action.title,
      reason: action.reason,
      actionType: action.action_type,
      priority: action.priority,
      score: action.score,
      confidence: action.confidence,
      dueDate: action.due_date ?? undefined,
      dependencyCount: action.dependency_count
    })),
    riskSignals: payload.risk_signals.map((signal) => ({
      key: signal.key,
      severity: signal.severity,
      title: signal.title,
      detail: signal.detail,
      projectId: signal.project_id ?? undefined,
      taskId: signal.task_id ?? undefined
    })),
    forecast: {
      status: payload.forecast.status,
      scheduleConfidence: payload.forecast.schedule_confidence,
      completionPercent: payload.forecast.completion_percent,
      remainingMinutes: payload.forecast.remaining_minutes,
      overdueTasks: payload.forecast.overdue_tasks,
      blockedTasks: payload.forecast.blocked_tasks,
      summary: payload.forecast.summary
    }
  };
}

function mapTeamIntelligence(payload?: ApiTeamIntelligence): TeamIntelligence {
  if (!payload) {
    return {
      generatedAt: "",
      provider: "nexus_local_team_heuristic_v1",
      headline: "Team intelligence is synchronizing with the Nexus API.",
      totalTeams: 0,
      laggingTeams: 0,
      unassignedTasks: 0,
      signals: []
    };
  }

  return {
    generatedAt: payload.generated_at,
    provider: payload.provider,
    headline: payload.headline,
    totalTeams: payload.total_teams,
    laggingTeams: payload.lagging_teams,
    unassignedTasks: payload.unassigned_tasks,
    signals: payload.signals.map((signal) => ({
      projectId: signal.project_id,
      projectName: signal.project_name,
      teamId: signal.team_id,
      teamName: signal.team_name,
      lead: signal.lead,
      responsibility: signal.responsibility,
      state: signal.state,
      assignedTaskCount: signal.assigned_task_count,
      assignedTaskTitles: signal.assigned_task_titles,
      openTaskCount: signal.open_task_count,
      completedTaskCount: signal.completed_task_count,
      blockedTaskCount: signal.blocked_task_count,
      overdueTaskCount: signal.overdue_task_count,
      remainingMinutes: signal.remaining_minutes,
      completionPercent: signal.completion_percent,
      capacityScore: signal.capacity_score,
      recoveryAction: signal.recovery_action
    }))
  };
}

export async function fetchGitHubActivity(
  owner: string,
  repo: string,
  accessToken: string
): Promise<GitHubRepositoryActivity> {
  const response = await fetch(
    `${API_URL}/api/v1/integrations/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/activity`,
    { headers: authHeaders(accessToken) }
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

export async function fetchProjectBlueprint(
  projectId: string,
  accessToken: string
): Promise<ProjectBlueprint> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/blueprint`, {
    headers: authHeaders(accessToken)
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Project blueprint loading failed"));
  }
  return mapBlueprint(await response.json());
}

export async function updateProjectBlueprint(
  projectId: string,
  blueprint: ProjectBlueprint,
  accessToken: string
): Promise<ProjectBlueprint> {
  const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/blueprint`, {
    method: "PUT",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({
      vision: blueprint.vision,
      definition_of_done: blueprint.definitionOfDone,
      strategy: blueprint.strategy,
      constraints: blueprint.constraints,
      goals: blueprint.goals,
      steps: blueprint.steps,
      teams: blueprint.teams.map((team) => ({
        id: team.id,
        name: team.name,
        lead: team.lead,
        responsibility: team.responsibility,
        task_ids: team.taskIds
      }))
    })
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Project blueprint saving failed"));
  }
  return mapBlueprint(await response.json());
}

export async function fetchPreferences(accessToken: string): Promise<Preferences> {
  const response = await fetch(`${API_URL}/api/v1/preferences`, {
    headers: authHeaders(accessToken)
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Preferences loading failed"));
  }
  const value = await response.json();
  return {
    reducedMotion: value.reduced_motion,
    compactInterface: value.compact_interface,
    autoBriefing: value.auto_briefing
  };
}

export async function updatePreferences(
  accessToken: string,
  preferences: Preferences
): Promise<Preferences> {
  const response = await fetch(`${API_URL}/api/v1/preferences`, {
    method: "PUT",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({
      reduced_motion: preferences.reducedMotion,
      compact_interface: preferences.compactInterface,
      auto_briefing: preferences.autoBriefing
    })
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Preferences saving failed"));
  }
  const value = await response.json();
  return {
    reducedMotion: value.reduced_motion,
    compactInterface: value.compact_interface,
    autoBriefing: value.auto_briefing
  };
}

function mapBlueprint(value: {
  project_id: string;
  vision: string;
  definition_of_done: string;
  strategy: string;
  constraints: string[];
  goals: ProjectBlueprint["goals"];
  steps: ProjectBlueprint["steps"];
  teams: Array<{
    id: string;
    name: string;
    lead: string;
    responsibility: string;
    task_ids: string[];
  }>;
  version: number;
  updated_at: string;
}): ProjectBlueprint {
  return {
    projectId: value.project_id,
    vision: value.vision,
    definitionOfDone: value.definition_of_done,
    strategy: value.strategy,
    constraints: value.constraints,
    goals: value.goals,
    steps: value.steps,
    teams: value.teams.map((team) => ({
      id: team.id,
      name: team.name,
      lead: team.lead,
      responsibility: team.responsibility,
      taskIds: team.task_ids
    })),
    version: value.version,
    updatedAt: value.updated_at
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

interface ApiTokenPayload {
  access_token: string;
  user_id: string;
  workspace_id: string;
  full_name?: string | null;
  email?: string | null;
  role?: NexusSession["role"] | null;
}

interface ApiAuthActionPayload {
  message: string;
  verification_required?: boolean;
}

interface ApiAccountPayload {
  user_id: string;
  workspace_id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  role: NexusAccount["role"];
  workspace_name: string;
  password_enabled: boolean;
  email_verified: boolean;
  demo_access: boolean;
  demo_workspace: boolean;
}

interface ApiWorkspace {
  id: string;
  name: string;
  role: NexusRole;
  plan_code: string;
}

interface ApiInvitation {
  id: string;
  email: string;
  role: Exclude<NexusRole, "owner">;
  expires_at: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
  invite_token?: string | null;
}

function sessionFromPayload(
  payload: ApiTokenPayload,
  identityProvider?: NexusSession["identityProvider"]
): NexusSession {
  return {
    accessToken: payload.access_token,
    userId: payload.user_id,
    workspaceId: payload.workspace_id,
    mode: "api",
    identityProvider,
    role: payload.role ?? undefined,
    displayName: payload.full_name ?? undefined,
    email: payload.email ?? undefined
  };
}

function mapAccount(payload: ApiAccountPayload): NexusAccount {
  return {
    userId: payload.user_id,
    workspaceId: payload.workspace_id,
    displayName: payload.full_name,
    email: payload.email,
    photoUrl: payload.avatar_url ?? undefined,
    role: payload.role,
    workspaceName: payload.workspace_name,
    passwordEnabled: payload.password_enabled,
    emailVerified: payload.email_verified,
    demoAccess: payload.demo_access,
    demoWorkspace: payload.demo_workspace
  };
}

function mapWorkspace(payload: ApiWorkspace): NexusWorkspace {
  return {
    id: payload.id,
    name: payload.name,
    role: payload.role,
    planCode: payload.plan_code
  };
}

function mapInvitation(payload: ApiInvitation): WorkspaceInvitation {
  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    expiresAt: payload.expires_at,
    acceptedAt: payload.accepted_at ?? undefined,
    revokedAt: payload.revoked_at ?? undefined,
    inviteToken: payload.invite_token ?? undefined
  };
}

export function mergeAccount(session: NexusSession, account: NexusAccount): NexusSession {
  return {
    ...session,
    userId: account.userId,
    workspaceId: account.workspaceId,
    displayName: account.displayName,
    email: account.email,
    photoUrl: account.photoUrl,
    role: account.role
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

function mergeProject(
  project: ApiProjectSummary,
  index: number,
  liveFeatures?: WorkspaceFeature[]
): ProjectSummary {
  const angle = index * 2.399963;
  const radius = index === 0 ? 0 : 4.5 + Math.sqrt(index) * 3.2;
  const accents = ["#48e5ff", "#8b7cff", "#53e3a6", "#ffd166", "#ff6b8a"];

  return {
    coordinates: [
      Math.cos(angle) * radius,
      ((index % 3) - 1) * 1.8,
      Math.sin(angle) * radius
    ] as [number, number, number],
    accent: accents[index % accents.length],
    planets: (liveFeatures ?? []).map((feature, featureIndex) => ({
      id: feature.id,
      name: feature.title,
      status: feature.status,
      progress: feature.progress,
      taskCount: feature.taskCount,
      blockedTaskCount: feature.blockedTaskCount,
      orbitRadius: 0.58 + featureIndex * 0.18
    })),
    id: project.id,
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
