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
  return saved ?? createDefaultBlueprint(projectId, projectName);
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
    goals: [
      { id: crypto.randomUUID(), title: "Confirm the final product scope", completed: false },
      { id: crypto.randomUUID(), title: "Complete the core user workflow", completed: false },
      { id: crypto.randomUUID(), title: "Verify quality, security, and deployment", completed: false }
    ],
    steps: [
      { id: crypto.randomUUID(), title: "Foundation and architecture", status: "active" },
      { id: crypto.randomUUID(), title: "Core product implementation", status: "pending" },
      { id: crypto.randomUUID(), title: "Testing and hardening", status: "pending" },
      { id: crypto.randomUUID(), title: "Launch and review", status: "pending" }
    ],
    updatedAt: new Date().toISOString()
  };
}
