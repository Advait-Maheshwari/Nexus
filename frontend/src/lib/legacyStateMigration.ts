import type { ProjectBlueprint } from "@/types/blueprint";
import type { Preferences } from "@/types/preferences";

const BLUEPRINTS_KEY = "nexus.blueprints.v2";
const PREFERENCES_KEY = "nexus.preferences.v1";

export function readLegacyBlueprint(projectId: string): Partial<ProjectBlueprint> | null {
  try {
    const raw = localStorage.getItem(BLUEPRINTS_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Record<string, Partial<ProjectBlueprint>>;
    return value[projectId] ?? null;
  } catch {
    return null;
  }
}

export function clearLegacyBlueprint(projectId: string): void {
  try {
    const raw = localStorage.getItem(BLUEPRINTS_KEY);
    if (!raw) return;
    const value = JSON.parse(raw) as Record<string, Partial<ProjectBlueprint>>;
    delete value[projectId];
    if (Object.keys(value).length === 0) {
      localStorage.removeItem(BLUEPRINTS_KEY);
    } else {
      localStorage.setItem(BLUEPRINTS_KEY, JSON.stringify(value));
    }
  } catch {
    // Invalid legacy state is ignored and cannot become application authority.
  }
}

export function readLegacyPreferences(): Partial<Preferences> | null {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return raw ? (JSON.parse(raw) as Partial<Preferences>) : null;
  } catch {
    return null;
  }
}

export function clearLegacyPreferences(): void {
  localStorage.removeItem(PREFERENCES_KEY);
}
