import { useEffect, useState } from "react";

import type { ProjectBlueprint } from "@/types/blueprint";

const STORAGE_KEY = "nexus.blueprints.v2";

export function useProjectBlueprint(projectId: string, projectName: string) {
  const [blueprint, setBlueprint] = useState<ProjectBlueprint>(() =>
    loadBlueprint(projectId, projectName)
  );

  useEffect(() => {
    setBlueprint(loadBlueprint(projectId, projectName));
  }, [projectId, projectName]);

  function save(next: ProjectBlueprint) {
    const blueprints = loadBlueprintMap();
    const saved = { ...next, projectId, updatedAt: new Date().toISOString() };
    blueprints[projectId] = saved;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blueprints));
    setBlueprint(saved);
  }

  return { blueprint, save };
}

function loadBlueprint(projectId: string, projectName: string): ProjectBlueprint {
  const saved = loadBlueprintMap()[projectId];
  return saved ? normalizeBlueprint(saved, projectId, projectName) : createDefaultBlueprint(projectId, projectName);
}

function loadBlueprintMap(): Record<string, ProjectBlueprint> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Record<string, ProjectBlueprint>) : {};
  } catch {
    return {};
  }
}

function createDefaultBlueprint(projectId: string, projectName: string): ProjectBlueprint {
  if (projectName.trim().toLowerCase() === "nexus") {
    return createNexusBlueprint(projectId);
  }

  return {
    projectId,
    vision: `Deliver ${projectName} as a reliable, polished product that solves its core user problem.`,
    definitionOfDone:
      "The primary workflow is complete, tested, documented, secure, and usable in production.",
    strategy:
      "Move in thin vertical slices: define the outcome, ship the smallest useful workflow, verify it, then polish the experience.",
    constraints: [
      "Keep the project zero-cost from Phase 1 through launch",
      "Prefer secure defaults, local-first fallbacks, and reusable product architecture",
      "Desktop and laptop quality comes first, with responsive phone support maintained"
    ],
    goals: [
      {
        id: crypto.randomUUID(),
        title: "Confirm the final product scope",
        measure: "The final outcome, target user, and required modules are written clearly.",
        completed: false
      },
      {
        id: crypto.randomUUID(),
        title: "Complete the core user workflow",
        measure: "A user can create a project, plan features, track tasks, and review progress.",
        completed: false
      },
      {
        id: crypto.randomUUID(),
        title: "Verify quality, security, and deployment",
        measure: "Typecheck, build, tests, security checks, and hosted URLs all pass.",
        completed: false
      }
    ],
    steps: [
      {
        id: crypto.randomUUID(),
        title: "Foundation and architecture",
        guidance: "Lock the data model, authentication boundary, deployment path, and zero-cost policy.",
        status: "active",
        priority: "critical"
      },
      {
        id: crypto.randomUUID(),
        title: "Core product implementation",
        guidance: "Build the project, feature, task, milestone, journal, and analytics loops as one connected workflow.",
        status: "pending",
        priority: "critical"
      },
      {
        id: crypto.randomUUID(),
        title: "Testing and hardening",
        guidance: "Run type checks, backend tests, security scans, validation rules, and mobile layout checks.",
        status: "pending",
        priority: "high"
      },
      {
        id: crypto.randomUUID(),
        title: "Launch and review",
        guidance: "Deploy, verify login and sync, review the product against the final vision, then plan the next cycle.",
        status: "pending",
        priority: "high"
      }
    ],
    teams: [],
    updatedAt: new Date().toISOString()
  };
}

function createNexusBlueprint(projectId: string): ProjectBlueprint {
  return {
    projectId,
    vision:
      "Build Nexus into a zero-cost, production-grade, futuristic 3D AI-powered project management system for personal use first, with an architecture ready to become a SaaS product without a major rewrite.",
    definitionOfDone:
      "Nexus is done when a user can securely sign up, manage real projects through project-feature-task-milestone loops, understand progress through Mission Control, Galaxy, City Builder, Analytics, Calendar, Ideas, and Journal, receive useful zero-cost AI-style guidance, and use the deployed app on desktop and phone.",
    strategy:
      "Finish the product in disciplined phases: lock the core spine, polish the cinematic 3D operating system, keep integrations free, harden cloud auth and security, then complete SaaS readiness with collaboration, monitoring, backup, and launch QA.",
    constraints: [
      "Total project cost must stay $0 from Phase 1 through the final phase",
      "Desktop and laptop quality is primary; phone support remains clean and usable",
      "Use local/free AI heuristics by default and only support paid providers through future user-owned keys",
      "Keep the codebase production-grade, secure, modular, and ready for SaaS expansion",
      "Do not add decorative features unless they explain project progress, health, risk, or next action"
    ],
    goals: [
      {
        id: crypto.randomUUID(),
        title: "Ship the personal Nexus command center",
        measure: "Mission Control, Projects, Galaxy, City Builder, Analytics, Calendar, Ideas, Journal, Profile, and Control Center work against the same Nexus project model.",
        completed: false
      },
      {
        id: crypto.randomUUID(),
        title: "Make Nexus secure enough for cloud use",
        measure: "Render, Neon, Firebase, JWT auth, role permissions, CORS, headers, validation, and live database sync are verified.",
        completed: false
      },
      {
        id: crypto.randomUUID(),
        title: "Keep every default workflow zero-cost",
        measure: "The hosted app, database, auth path, integrations, reports, and AI-style recommendations run on free tiers or local logic.",
        completed: false
      },
      {
        id: crypto.randomUUID(),
        title: "Prepare SaaS expansion without rewrites",
        measure: "Workspace roles, account management, deployment configuration, test coverage, monitoring plan, and launch checklist are in place.",
        completed: false
      }
    ],
    steps: [
      {
        id: crypto.randomUUID(),
        title: "Phase 1: Core Spine",
        guidance:
          "Maintain the monorepo, data model, auth base, CRUD services, local development runtime, PostgreSQL path, and zero-cost policy as the stable foundation.",
        status: "done",
        priority: "critical"
      },
      {
        id: crypto.randomUUID(),
        title: "Phase 2: Cinematic 3D OS",
        guidance:
          "Keep Mission Control, Galaxy/Solar, City Builder, and Analytics meaningful: every visual object must explain project health, progress, risk, or next work.",
        status: "done",
        priority: "critical"
      },
      {
        id: crypto.randomUUID(),
        title: "Phase 3: Free Integrations",
        guidance:
          "Use GitHub public activity, local calendar files, local reports, Markdown exports, and copyable Slack/Discord briefings without paid services.",
        status: "done",
        priority: "high"
      },
      {
        id: crypto.randomUUID(),
        title: "Phase 4: Cloud, Auth, and Security",
        guidance:
          "Finish live Render/Neon/Firebase verification, session validation, account/profile management, password recovery design, role enforcement, and live PostgreSQL test coverage.",
        status: "active",
        priority: "critical"
      },
      {
        id: crypto.randomUUID(),
        title: "Phase 5: SaaS Launch Readiness",
        guidance:
          "Add workspace collaboration polish, onboarding, monitoring, backup/restore planning, final responsive QA, launch checklist, and external security review preparation.",
        status: "pending",
        priority: "critical"
      }
    ],
    teams: [
      {
        id: crypto.randomUUID(),
        name: "Product & Delivery",
        lead: "Project owner",
        responsibility:
          "Own scope, project goals, roadmap decisions, delivery priorities, and release acceptance.",
        taskIds: []
      },
      {
        id: crypto.randomUUID(),
        name: "Client Experience",
        lead: "Experience lead",
        responsibility:
          "Own Mission Control, Galaxy, City Builder, analytics, HCI quality, accessibility, and responsive UI.",
        taskIds: []
      },
      {
        id: crypto.randomUUID(),
        name: "Server Platform & Security",
        lead: "Platform lead",
        responsibility:
          "Own the API, data model, authentication, authorization, automated tests, and security controls.",
        taskIds: []
      },
      {
        id: crypto.randomUUID(),
        name: "Cloud & Reliability",
        lead: "Operations lead",
        responsibility:
          "Own Render, Neon, Firebase, monitoring, backups, recovery procedures, and launch operations.",
        taskIds: []
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

function normalizeBlueprint(
  blueprint: ProjectBlueprint,
  projectId: string,
  projectName: string
): ProjectBlueprint {
  const fallback = createDefaultBlueprint(projectId, projectName);
  return {
    ...fallback,
    ...blueprint,
    projectId,
    strategy: blueprint.strategy || fallback.strategy,
    constraints: Array.isArray(blueprint.constraints) && blueprint.constraints.length > 0
      ? blueprint.constraints
      : fallback.constraints,
    goals: (blueprint.goals?.length ? blueprint.goals : fallback.goals).map((goal, index) => ({
      ...fallback.goals[Math.min(index, fallback.goals.length - 1)],
      ...goal,
      measure:
        goal.measure ||
        fallback.goals[Math.min(index, fallback.goals.length - 1)]?.measure ||
        "This goal has a clear, observable result."
    })),
    steps: (blueprint.steps?.length ? blueprint.steps : fallback.steps).map((step, index) => ({
      ...fallback.steps[Math.min(index, fallback.steps.length - 1)],
      ...step,
      guidance:
        step.guidance ||
        fallback.steps[Math.min(index, fallback.steps.length - 1)]?.guidance ||
        "Complete the smallest useful slice, verify it, then move forward.",
      priority: step.priority || fallback.steps[Math.min(index, fallback.steps.length - 1)]?.priority || "medium"
    })),
    teams: (Array.isArray(blueprint.teams) ? blueprint.teams : fallback.teams).map((team) => ({
      id: team.id || crypto.randomUUID(),
      name: team.name || "Delivery team",
      lead: team.lead || "Unassigned",
      responsibility: team.responsibility || "Define this team's delivery responsibility.",
      taskIds: Array.isArray(team.taskIds) ? [...new Set(team.taskIds)] : []
    }))
  };
}
