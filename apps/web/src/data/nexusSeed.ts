import type { MissionData } from "@/types/domain";

export const missionData: MissionData = {
  metrics: [
    { label: "Product Progress", value: "58%", delta: "Phase 4 active", tone: "cyan" },
    { label: "Launch Health", value: "84", delta: "cloud path verified", tone: "green" },
    { label: "Zero-Cost Policy", value: "$0", delta: "required through launch", tone: "gold" },
    { label: "Critical Gaps", value: "5", delta: "security and SaaS polish", tone: "red" }
  ],
  projects: [
    {
      id: "nexus",
      name: "Nexus",
      codename: "ORION",
      status: "in_progress",
      health: "stable",
      healthScore: 84,
      progress: 58,
      priority: "critical",
      deadline: "Aug 15",
      timeSpentMinutes: 3180,
      velocity: 7.8,
      featureCount: 6,
      taskCount: 48,
      blockedTaskCount: 3,
      coordinates: [0, 0, 0],
      accent: "#48e5ff",
      planets: [
        {
          id: "nexus-foundation",
          name: "Foundation",
          status: "done",
          progress: 100,
          taskCount: 8,
          blockedTaskCount: 0,
          orbitRadius: 0.5
        },
        {
          id: "nexus-3d-os",
          name: "3D Command OS",
          status: "in_progress",
          progress: 72,
          taskCount: 10,
          blockedTaskCount: 0,
          orbitRadius: 0.66
        },
        {
          id: "nexus-project-manager",
          name: "Project Manager",
          status: "in_progress",
          progress: 64,
          taskCount: 9,
          blockedTaskCount: 0,
          orbitRadius: 0.82
        },
        {
          id: "nexus-cloud-security",
          name: "Cloud and Security",
          status: "in_progress",
          progress: 46,
          taskCount: 11,
          blockedTaskCount: 2,
          orbitRadius: 0.98
        },
        {
          id: "nexus-ai-briefing",
          name: "Free AI Briefing",
          status: "ready",
          progress: 42,
          taskCount: 5,
          blockedTaskCount: 0,
          orbitRadius: 1.14
        },
        {
          id: "nexus-saas-launch",
          name: "SaaS Launch Path",
          status: "backlog",
          progress: 18,
          taskCount: 5,
          blockedTaskCount: 1,
          orbitRadius: 1.3
        }
      ]
    }
  ],
  relationships: [],
  todayMission: [
    "Verify Render, Neon, Firebase, and GitHub stay connected on the free tier",
    "Turn Project Manager into the source of truth for Nexus goals, phases, tasks, and launch readiness",
    "Remove placeholder data and keep every default screen aligned to the real Nexus roadmap"
  ],
  aiRecommendations: [
    {
      title: "Next best move",
      body: "Finish Phase 4 cloud hardening: live auth checks, session validation, account profile, and recovery planning.",
      confidence: 0.91,
      actionLabel: "Open Phase 4"
    },
    {
      title: "Zero-cost guardrail",
      body: "Keep AI recommendations local and rule-based until the product can accept user-owned API keys.",
      confidence: 0.86,
      actionLabel: "Review policy"
    },
    {
      title: "Launch focus",
      body: "Do not start broad SaaS expansion until the Nexus project manager, security path, and hosted cloud sync are stable.",
      confidence: 0.83,
      actionLabel: "Check roadmap"
    }
  ],
  activity: [
    "Phase 1 foundation completed for the current MVP",
    "Phase 2 cinematic Galaxy, City Builder, Mission Control, and Analytics upgraded",
    "Phase 3 zero-cost integrations completed for the current MVP",
    "Phase 4 cloud, auth, and security hardening is active"
  ],
  timeline: [
    { id: "t1", label: "Phase 1 Core Spine", type: "milestone", status: "done", date: "Jun 29" },
    { id: "t2", label: "Phase 2 3D Operating System", type: "feature", status: "done", date: "Jul 06" },
    { id: "t3", label: "Phase 3 Free Integrations", type: "feature", status: "done", date: "Jul 07" },
    { id: "t4", label: "Phase 4 Security and Cloud", type: "milestone", status: "in_progress", date: "Jul 09" },
    { id: "t5", label: "Phase 5 SaaS Launch Readiness", type: "event", status: "backlog", date: "Aug 15" }
  ]
};
