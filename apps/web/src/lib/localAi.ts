import type { MissionData, ProjectSummary } from "@/types/domain";

export interface LocalBriefing {
  headline: string;
  focus: string;
  nextTask: string;
  delayRisk: string;
  bottleneck: string;
  weeklyReview: string;
  report: string;
}

export function createLocalBriefing(data: MissionData): LocalBriefing {
  const projects = [...data.projects];
  const highestPriority = projects.sort(prioritySort)[0] ?? data.projects[0];
  const mostBlocked = [...data.projects].sort(
    (first, second) => second.blockedTaskCount - first.blockedTaskCount
  )[0];
  const soonestDeadline = [...data.projects]
    .filter((project) => project.deadline)
    .sort((first, second) => dateScore(first.deadline) - dateScore(second.deadline))[0];
  const weakestFeature = highestPriority?.planets
    ? [...highestPriority.planets].sort((first, second) => first.progress - second.progress)[0]
    : undefined;
  const averageProgress =
    data.projects.length === 0
      ? 0
      : Math.round(
          data.projects.reduce((total, project) => total + project.progress, 0) /
            data.projects.length
        );
  const totalBlocked = data.projects.reduce(
    (total, project) => total + project.blockedTaskCount,
    0
  );

  return {
    headline: `${averageProgress}% portfolio progress with ${totalBlocked} blocked task signals.`,
    focus: highestPriority
      ? `Focus on ${highestPriority.name}. It is ${highestPriority.priority} priority and ${highestPriority.progress}% complete.`
      : "Create a project before planning the next mission.",
    nextTask:
      highestPriority && weakestFeature
        ? `Move ${weakestFeature.name} forward with one small task; it is at ${weakestFeature.progress}% and drives ${highestPriority.name}.`
        : "Pick the smallest unfinished task and finish it before adding more scope.",
    delayRisk: soonestDeadline
      ? `${soonestDeadline.name} has the closest deadline (${soonestDeadline.deadline}) at ${soonestDeadline.progress}% completion.`
      : "No hard deadline is visible yet. Add one if the project needs time pressure.",
    bottleneck:
      mostBlocked && mostBlocked.blockedTaskCount > 0
        ? `${mostBlocked.name} has ${mostBlocked.blockedTaskCount} blocker${mostBlocked.blockedTaskCount === 1 ? "" : "s"}; resolve that before expanding the roadmap.`
        : "No major blocker cluster detected from the current project graph.",
    weeklyReview: `This week should protect the zero-cost policy, close visible blockers, and move the highest-priority project through one complete project-feature-task loop.`,
    report: buildReport(data, averageProgress, totalBlocked)
  };
}

export function downloadTextFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function createCalendarExport(data: MissionData) {
  const events = data.projects
    .filter((project) => project.deadline)
    .map((project) => {
      const stamp = formatIcsDate(project.deadline);
      return [
        "BEGIN:VEVENT",
        `UID:${project.id}@nexus.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${stamp.slice(0, 8)}`,
        `SUMMARY:${escapeIcs(project.name)} deadline`,
        `DESCRIPTION:${escapeIcs(`${project.progress}% complete / health ${project.healthScore}`)}`,
        "END:VEVENT"
      ].join("\n");
    });

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nexus//Zero Cost Calendar//EN", ...events, "END:VCALENDAR"].join("\n");
}

export function createNotionMarkdownExport(data: MissionData) {
  return [
    "# Nexus Project Export",
    "",
    ...data.projects.flatMap((project) => [
      `## ${project.name}`,
      "",
      `- Codename: ${project.codename}`,
      `- Status: ${project.status}`,
      `- Priority: ${project.priority}`,
      `- Progress: ${project.progress}%`,
      `- Health: ${project.healthScore}`,
      `- Deadline: ${project.deadline ?? "None"}`,
      "",
      "### Features",
      "",
      ...project.planets.map(
        (feature) =>
          `- ${feature.name}: ${feature.progress}% / ${feature.taskCount} tasks / ${feature.blockedTaskCount} blocked`
      ),
      ""
    ])
  ].join("\n");
}

export function createDriveManifest(data: MissionData) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      policy: "zero-cost local manifest; upload manually to any free storage provider",
      projects: data.projects.map((project) => ({
        id: project.id,
        name: project.name,
        folders: ["briefs", "attachments", "reports", "exports"],
        suggestedPath: `Nexus/${project.codename}-${project.name.replace(/[^A-Za-z0-9]+/g, "-")}`
      }))
    },
    null,
    2
  );
}

export function createNotificationTemplate(data: MissionData) {
  const briefing = createLocalBriefing(data);
  return [
    "Nexus briefing",
    briefing.headline,
    briefing.focus,
    briefing.nextTask,
    briefing.bottleneck
  ].join("\n");
}

function buildReport(data: MissionData, averageProgress: number, totalBlocked: number) {
  return [
    "# Nexus Local Report",
    "",
    `Generated: ${new Date().toLocaleString()}`,
    `Average progress: ${averageProgress}%`,
    `Blocked tasks: ${totalBlocked}`,
    "",
    "## Projects",
    "",
    ...data.projects.flatMap((project) => [
      `### ${project.name}`,
      `Progress: ${project.progress}%`,
      `Health: ${project.healthScore}`,
      `Velocity: ${project.velocity}`,
      `Time spent: ${Math.round(project.timeSpentMinutes / 60)}h`,
      `Next feature focus: ${[...project.planets].sort((first, second) => first.progress - second.progress)[0]?.name ?? "None"}`,
      ""
    ])
  ].join("\n");
}

function prioritySort(first: ProjectSummary, second: ProjectSummary) {
  const weights = { critical: 4, high: 3, medium: 2, low: 1 };
  return weights[second.priority] - weights[first.priority] || second.healthScore - first.healthScore;
}

function dateScore(date?: string) {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function formatIcsDate(date?: string) {
  const parsed = date ? new Date(date) : new Date();
  const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return safe.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
