import { useEffect, useState } from "react";

import type { ProjectBlueprint } from "@/types/blueprint";

const STORAGE_KEY = "nexus.blueprints.v1";

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
    }))
  };
}
