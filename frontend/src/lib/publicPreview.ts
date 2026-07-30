import type { MissionData } from "@/types/domain";

export const publicPreviewMissionData: MissionData = {
  metrics: [
    {
      label: "Overall Progress",
      value: "72%",
      delta: "phase 7 preview",
      tone: "cyan"
    },
    {
      label: "Portfolio Health",
      value: "88",
      delta: "goal-aware",
      tone: "green"
    },
    {
      label: "Focus Hours",
      value: "41.5h",
      delta: "planned effort",
      tone: "gold"
    },
    {
      label: "Blocked Tasks",
      value: "1",
      delta: "needs recovery",
      tone: "red"
    }
  ],
  projects: [
    {
      id: "preview-nexus",
      name: "Nexus Product Launch",
      codename: "NEXUS",
      status: "in_progress",
      health: "excellent",
      healthScore: 91,
      progress: 76,
      priority: "critical",
      deadline: "2026-08-30",
      timeSpentMinutes: 1860,
      velocity: 8.4,
      featureCount: 4,
      taskCount: 18,
      blockedTaskCount: 0,
      coordinates: [0, 0, 0],
      accent: "#48e5ff",
      planets: [
        {
          id: "preview-galaxy",
          name: "Galaxy Systems",
          status: "in_progress",
          progress: 82,
          taskCount: 5,
          blockedTaskCount: 0,
          orbitRadius: 3.8
        },
        {
          id: "preview-city",
          name: "City Builder",
          status: "in_progress",
          progress: 74,
          taskCount: 4,
          blockedTaskCount: 0,
          orbitRadius: 5
        },
        {
          id: "preview-auth",
          name: "Secure Auth",
          status: "done",
          progress: 100,
          taskCount: 5,
          blockedTaskCount: 0,
          orbitRadius: 6.4
        },
        {
          id: "preview-ai",
          name: "Free AI Briefing",
          status: "in_progress",
          progress: 68,
          taskCount: 4,
          blockedTaskCount: 0,
          orbitRadius: 7.6
        }
      ]
    },
    {
      id: "preview-saas",
      name: "SaaS Readiness",
      codename: "ORBIT",
      status: "ready",
      health: "stable",
      healthScore: 79,
      progress: 54,
      priority: "high",
      deadline: "2026-09-18",
      timeSpentMinutes: 630,
      velocity: 4.1,
      featureCount: 3,
      taskCount: 10,
      blockedTaskCount: 1,
      coordinates: [8, 1.2, -2],
      accent: "#8d67ff",
      planets: [
        {
          id: "preview-teams",
          name: "Teams & Roles",
          status: "in_progress",
          progress: 62,
          taskCount: 3,
          blockedTaskCount: 0,
          orbitRadius: 4
        },
        {
          id: "preview-observability",
          name: "Operations",
          status: "blocked",
          progress: 38,
          taskCount: 4,
          blockedTaskCount: 1,
          orbitRadius: 5.5
        },
        {
          id: "preview-backups",
          name: "Backup Drills",
          status: "done",
          progress: 100,
          taskCount: 3,
          blockedTaskCount: 0,
          orbitRadius: 6.9
        }
      ]
    }
  ],
  relationships: [
    {
      id: "preview-link-1",
      sourceProjectId: "preview-nexus",
      targetProjectId: "preview-saas",
      type: "dependency",
      strength: 0.78,
      label: "SaaS readiness depends on the Nexus launch spine."
    }
  ],
  todayMission: [
    "Review SaaS Readiness operations blocker",
    "Protect the zero-cost policy before adding integrations",
    "Keep the next Nexus task small and verifiable"
  ],
  aiRecommendations: [
    {
      title: "Recover operations blocker",
      body: "Resolve the single blocked operations path before expanding SaaS scope.",
      confidence: 0.92,
      actionLabel: "Inspect blocker"
    }
  ],
  activity: [
    "Preview mode loaded without creating an account",
    "Goal-aware health is calculated from project intent and work state",
    "Teams and sub-teams own delivery lanes"
  ],
  timeline: [],
  executionIntelligence: {
    generatedAt: new Date().toISOString(),
    provider: "nexus_public_preview_v1",
    headline: "Start with SaaS Readiness operations blocker before adding more launch scope.",
    nextActions: [
      {
        projectId: "preview-saas",
        projectName: "SaaS Readiness",
        title: "Recover operations blocker",
        reason: "One blocked task is lowering the launch readiness score.",
        actionType: "unblock",
        priority: "high",
        score: 94,
        confidence: 0.92,
        dueDate: "2026-09-18",
        dependencyCount: 1
      }
    ],
    riskSignals: [
      {
        key: "preview-operations-risk",
        severity: "high",
        title: "Operations blocker",
        detail: "SaaS readiness has one blocked operational lane.",
        projectId: "preview-saas"
      }
    ],
    forecast: {
      status: "watch",
      scheduleConfidence: 82,
      completionPercent: 67,
      remainingMinutes: 720,
      overdueTasks: 0,
      blockedTasks: 1,
      summary: "Preview portfolio is healthy, but one operations blocker should be recovered."
    }
  },
  teamIntelligence: {
    generatedAt: new Date().toISOString(),
    provider: "nexus_public_preview_team_v1",
    headline: "One team lane needs recovery; start with Cloud & Reliability.",
    totalTeams: 3,
    laggingTeams: 1,
    unassignedTasks: 0,
    signals: [
      {
        projectId: "preview-saas",
        projectName: "SaaS Readiness",
        teamId: "preview-reliability",
        teamName: "Cloud & Reliability",
        lead: "Operations lead",
        responsibility: "Own deployment, backup, recovery, and free-tier reliability.",
        subteamCount: 2,
        state: "lagging",
        assignedTaskCount: 4,
        assignedTaskTitles: ["Verify Render cold start", "Review recovery drill"],
        openTaskCount: 2,
        completedTaskCount: 2,
        blockedTaskCount: 1,
        overdueTaskCount: 0,
        remainingMinutes: 260,
        completionPercent: 50,
        capacityScore: 58,
        recoveryAction: "Operations lead should clear the deployment blocker before adding scope."
      }
    ]
  }
};
