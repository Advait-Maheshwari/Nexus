import { useEffect, useState } from "react";

import { fetchProjectBlueprint, updateProjectBlueprint } from "@/lib/api";
import {
  clearLegacyBlueprint,
  readLegacyBlueprint
} from "@/lib/legacyStateMigration";
import type { ProjectBlueprint } from "@/types/blueprint";

export function useProjectBlueprint(
  projectId: string,
  projectName: string,
  accessToken: string
) {
  const [blueprint, setBlueprint] = useState<ProjectBlueprint>(() =>
    loadingBlueprint(projectId, projectName)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setBlueprint(loadingBlueprint(projectId, projectName));

    void fetchProjectBlueprint(projectId, accessToken)
      .then(async (serverBlueprint) => {
        const legacy = readLegacyBlueprint(projectId);
        if (!legacy) return serverBlueprint;

        const migrated = mergeLegacyBlueprint(serverBlueprint, legacy, projectId);
        const saved = await updateProjectBlueprint(projectId, migrated, accessToken);
        clearLegacyBlueprint(projectId);
        return saved;
      })
      .then((next) => {
        if (active) setBlueprint(next);
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Project blueprint failed to load.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken, projectId, projectName]);

  async function save(next: ProjectBlueprint): Promise<boolean> {
    const previous = blueprint;
    setBlueprint(next);
    setSaving(true);
    setError("");
    try {
      setBlueprint(await updateProjectBlueprint(projectId, next, accessToken));
      return true;
    } catch (reason) {
      setBlueprint(previous);
      setError(reason instanceof Error ? reason.message : "Project blueprint failed to save.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { blueprint, save, loading, saving, error };
}

function loadingBlueprint(projectId: string, projectName: string): ProjectBlueprint {
  return {
    projectId,
    vision: `Loading ${projectName} execution plan...`,
    definitionOfDone: "Loading the server-owned completion criteria...",
    strategy: "Loading the server-owned delivery strategy...",
    constraints: [],
    goals: [],
    steps: [],
    teams: [],
    version: 0,
    updatedAt: new Date(0).toISOString()
  };
}

function mergeLegacyBlueprint(
  server: ProjectBlueprint,
  legacy: Partial<ProjectBlueprint>,
  projectId: string
): ProjectBlueprint {
  return {
    ...server,
    ...legacy,
    projectId,
    vision: legacy.vision?.trim() || server.vision,
    definitionOfDone: legacy.definitionOfDone?.trim() || server.definitionOfDone,
    strategy: legacy.strategy?.trim() || server.strategy,
    constraints: legacy.constraints?.length ? legacy.constraints : server.constraints,
    goals: legacy.goals?.length ? legacy.goals : server.goals,
    steps: legacy.steps?.length ? legacy.steps : server.steps,
    teams: Array.isArray(legacy.teams) ? legacy.teams : server.teams,
    version: server.version,
    updatedAt: server.updatedAt
  };
}
