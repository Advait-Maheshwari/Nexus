import type { MissionData } from "@/types/domain";

export const missionData: MissionData = {
  metrics: [
    { label: "Overall Progress", value: "38%", delta: "+12% this week", tone: "cyan" },
    { label: "Portfolio Health", value: "82", delta: "stable orbit", tone: "green" },
    { label: "Focus Hours", value: "21h", delta: "+4h vs last week", tone: "gold" },
    { label: "Blocked Tasks", value: "7", delta: "2 critical", tone: "red" }
  ],
  projects: [
    {
      id: "nexus",
      name: "Nexus",
      codename: "ORION",
      status: "in_progress",
      health: "excellent",
      healthScore: 88,
      progress: 34,
      priority: "critical",
      deadline: "Aug 15",
      timeSpentMinutes: 1260,
      velocity: 7.4,
      featureCount: 8,
      taskCount: 42,
      blockedTaskCount: 2,
      coordinates: [-1.7, 0.35, 0],
      accent: "#48e5ff",
      planets: [
        {
          id: "nexus-core",
          name: "Core Spine",
          status: "in_progress",
          progress: 62,
          taskCount: 14,
          blockedTaskCount: 1,
          orbitRadius: 0.52
        },
        {
          id: "nexus-galaxy",
          name: "Galaxy View",
          status: "in_progress",
          progress: 46,
          taskCount: 9,
          blockedTaskCount: 0,
          orbitRadius: 0.66
        },
        {
          id: "nexus-ai",
          name: "Local AI OS",
          status: "ready",
          progress: 24,
          taskCount: 11,
          blockedTaskCount: 1,
          orbitRadius: 0.8
        },
        {
          id: "nexus-analytics",
          name: "Analytics",
          status: "ready",
          progress: 35,
          taskCount: 8,
          blockedTaskCount: 0,
          orbitRadius: 0.94
        }
      ]
    },
    {
      id: "ai-lab",
      name: "AI Research Lab",
      codename: "LYRA",
      status: "ready",
      health: "stable",
      healthScore: 74,
      progress: 58,
      priority: "high",
      deadline: "Jul 28",
      timeSpentMinutes: 860,
      velocity: 4.1,
      featureCount: 5,
      taskCount: 29,
      blockedTaskCount: 1,
      coordinates: [1.3, 0.1, -0.8],
      accent: "#8d67ff",
      planets: [
        {
          id: "ai-briefings",
          name: "Briefings",
          status: "ready",
          progress: 52,
          taskCount: 6,
          blockedTaskCount: 0,
          orbitRadius: 0.5
        },
        {
          id: "ai-risk",
          name: "Risk Engine",
          status: "in_progress",
          progress: 41,
          taskCount: 8,
          blockedTaskCount: 1,
          orbitRadius: 0.66
        },
        {
          id: "ai-local-models",
          name: "Local Models",
          status: "backlog",
          progress: 10,
          taskCount: 7,
          blockedTaskCount: 0,
          orbitRadius: 0.82
        }
      ]
    },
    {
      id: "startup",
      name: "Startup Concepts",
      codename: "NOVA",
      status: "in_progress",
      health: "at_risk",
      healthScore: 61,
      progress: 21,
      priority: "medium",
      timeSpentMinutes: 430,
      velocity: 2.8,
      featureCount: 6,
      taskCount: 35,
      blockedTaskCount: 4,
      coordinates: [0.25, -0.75, 1.1],
      accent: "#f5c451",
      planets: [
        {
          id: "startup-ideas",
          name: "Idea Vault",
          status: "in_progress",
          progress: 34,
          taskCount: 10,
          blockedTaskCount: 2,
          orbitRadius: 0.5
        },
        {
          id: "startup-validation",
          name: "Validation",
          status: "blocked",
          progress: 18,
          taskCount: 12,
          blockedTaskCount: 2,
          orbitRadius: 0.68
        },
        {
          id: "startup-roadmap",
          name: "Roadmap",
          status: "ready",
          progress: 22,
          taskCount: 8,
          blockedTaskCount: 0,
          orbitRadius: 0.86
        }
      ]
    },
    {
      id: "college",
      name: "College Systems",
      codename: "ATLAS",
      status: "ready",
      health: "stable",
      healthScore: 78,
      progress: 46,
      priority: "high",
      deadline: "Sep 02",
      timeSpentMinutes: 520,
      velocity: 3.6,
      featureCount: 4,
      taskCount: 24,
      blockedTaskCount: 0,
      coordinates: [-0.45, 0.95, -1.4],
      accent: "#4ade80",
      planets: [
        {
          id: "college-deadlines",
          name: "Deadlines",
          status: "ready",
          progress: 55,
          taskCount: 6,
          blockedTaskCount: 0,
          orbitRadius: 0.48
        },
        {
          id: "college-reports",
          name: "Reports",
          status: "in_progress",
          progress: 48,
          taskCount: 9,
          blockedTaskCount: 0,
          orbitRadius: 0.64
        },
        {
          id: "college-calendar",
          name: "Calendar",
          status: "ready",
          progress: 31,
          taskCount: 7,
          blockedTaskCount: 0,
          orbitRadius: 0.8
        }
      ]
    }
  ],
  relationships: [
    {
      id: "rel-nexus-ai",
      sourceProjectId: "nexus",
      targetProjectId: "ai-lab",
      type: "shared-ai",
      strength: 0.92,
      label: "AI engine feeds Nexus briefings"
    },
    {
      id: "rel-nexus-startup",
      sourceProjectId: "nexus",
      targetProjectId: "startup",
      type: "inspiration",
      strength: 0.68,
      label: "Nexus validates startup workflows"
    },
    {
      id: "rel-college-nexus",
      sourceProjectId: "college",
      targetProjectId: "nexus",
      type: "shared-deadline",
      strength: 0.54,
      label: "Calendar pressure affects Nexus focus"
    },
    {
      id: "rel-startup-ai",
      sourceProjectId: "startup",
      targetProjectId: "ai-lab",
      type: "dependency",
      strength: 0.73,
      label: "Startup scoring depends on AI research"
    }
  ],
  todayMission: [
    "Finish Phase 1 CRUD/auth decisions before calling it complete",
    "Upgrade Galaxy planets and constellation links",
    "Keep every AI feature local and zero-cost by default"
  ],
  aiRecommendations: [
    {
      title: "Next best move",
      body: "Complete persistent task CRUD while Phase 2 visuals consume the same project graph.",
      confidence: 0.89,
      actionLabel: "Open task spine"
    },
    {
      title: "Zero-cost guardrail",
      body: "Use local heuristics for briefing, delay detection, and project summaries before adding any provider key.",
      confidence: 0.77,
      actionLabel: "Review policy"
    },
    {
      title: "Galaxy insight",
      body: "The strongest link is Nexus to AI Research Lab, so build AI signals as reusable analytics first.",
      confidence: 0.81,
      actionLabel: "Inspect links"
    }
  ],
  activity: [
    "Nexus architecture initialized",
    "Galaxy View upgraded with feature-planets and project links",
    "Health scoring formula drafted",
    "Zero-cost AI provider boundary created"
  ],
  timeline: [
    { id: "t1", label: "Architecture", type: "milestone", status: "done", date: "Jun 29" },
    { id: "t2", label: "Task Spine", type: "feature", status: "in_progress", date: "Jul 02" },
    { id: "t3", label: "Galaxy MVP", type: "feature", status: "ready", date: "Jul 06" },
    { id: "t4", label: "AI Briefing", type: "task", status: "backlog", date: "Jul 10" },
    { id: "t5", label: "Private Alpha", type: "event", status: "backlog", date: "Aug 15" }
  ]
};
