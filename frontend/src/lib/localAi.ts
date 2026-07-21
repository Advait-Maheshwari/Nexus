import type { MissionData, ProjectSummary } from "@/types/domain";

export interface LocalBriefing {
  headline: string;
  focus: string;
  nextTask: string;
  actionPlan: string[];
  delayRisk: string;
  bottleneck: string;
  healthNarrative: string;
  weeklyReview: string;
  report: string;
}

export function createLocalBriefing(data: MissionData): LocalBriefing {
  const hasProjects = data.projects.length > 0;
  const projects = [...data.projects];
  const highestPriority = projects.sort(prioritySort)[0] ?? data.projects[0];
  const mostBlocked = [...data.projects].sort(
    (first, second) => second.blockedTaskCount - first.blockedTaskCount
  )[0];
  const slowestHealthyProject = [...data.projects]
    .filter((project) => project.healthScore >= 70)
    .sort((first, second) => first.velocity - second.velocity)[0];
  const soonestDeadline = [...data.projects]
    .filter((project) => project.deadline)
    .sort((first, second) => dateScore(first.deadline) - dateScore(second.deadline))[0];
  const weakestFeature = highestPriority?.planets
    ? [...highestPriority.planets].sort((first, second) => first.progress - second.progress)[0]
    : undefined;
  const averageProgress =
    !hasProjects
      ? 0
      : Math.round(
          data.projects.reduce((total, project) => total + project.progress, 0) /
            data.projects.length
        );
  const totalBlocked = data.projects.reduce(
    (total, project) => total + project.blockedTaskCount,
    0
  );
  const averageHealth =
    !hasProjects
      ? 100
      : Math.round(data.projects.reduce((total, project) => total + project.healthScore, 0) / data.projects.length);
  const actionPlan = buildActionPlan({
    highestPriority,
    mostBlocked,
    soonestDeadline,
    weakestFeature,
    slowestHealthyProject
  });

  return {
    headline: hasProjects
      ? `${averageProgress}% portfolio progress, ${averageHealth}/100 health, and ${totalBlocked} blocked task signal${totalBlocked === 1 ? "" : "s"}.`
      : "No project signal yet. Create the first project, define its outcome, and add one finishable task.",
    focus: highestPriority
      ? `Focus on ${highestPriority.name}. It is ${highestPriority.priority} priority, ${highestPriority.progress}% complete, and carrying ${highestPriority.blockedTaskCount} blocker${highestPriority.blockedTaskCount === 1 ? "" : "s"}.`
      : "Create a project before planning the next mission.",
    nextTask:
      highestPriority && weakestFeature
        ? `Move ${weakestFeature.name} forward with one concrete task; it is at ${weakestFeature.progress}% and drives ${highestPriority.name}.`
        : "Pick the smallest unfinished task and finish it before adding more scope.",
    actionPlan,
    delayRisk: soonestDeadline
      ? `${soonestDeadline.name} has the closest deadline (${soonestDeadline.deadline}) at ${soonestDeadline.progress}% completion. Keep scope tight until it crosses 60%.`
      : "No hard deadline is visible yet. Add one if the project needs time pressure.",
    bottleneck:
      mostBlocked && mostBlocked.blockedTaskCount > 0
        ? `${mostBlocked.name} has ${mostBlocked.blockedTaskCount} blocker${mostBlocked.blockedTaskCount === 1 ? "" : "s"}; resolve that before expanding the roadmap.`
        : "No major blocker cluster detected from the current project graph.",
    healthNarrative: !hasProjects
      ? "No portfolio risk is active yet. Health scoring begins when the first project has real work."
      : averageHealth >= 80
        ? "Portfolio health is strong. The best move is focused execution, not adding new systems."
        : averageHealth >= 68
          ? "Portfolio health is usable but uneven. Clear blockers and stabilize low-progress features."
          : "Portfolio health is under pressure. Reduce scope and recover one project before expanding.",
    weeklyReview:
      "This week should protect the zero-cost policy, close visible blockers, and move one project through a complete project-feature-task loop.",
    report: buildReport(data, averageProgress, averageHealth, totalBlocked, actionPlan)
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
    ...briefing.actionPlan,
    briefing.bottleneck
  ].join("\n");
}

function buildActionPlan({
  highestPriority,
  mostBlocked,
  soonestDeadline,
  weakestFeature,
  slowestHealthyProject
}: {
  highestPriority?: ProjectSummary;
  mostBlocked?: ProjectSummary;
  soonestDeadline?: ProjectSummary;
  weakestFeature?: ProjectSummary["planets"][number];
  slowestHealthyProject?: ProjectSummary;
}) {
  const moves = [
    mostBlocked && mostBlocked.blockedTaskCount > 0
      ? `Unblock ${mostBlocked.name}: remove ${mostBlocked.blockedTaskCount} blocker${mostBlocked.blockedTaskCount === 1 ? "" : "s"} before creating new tasks.`
      : undefined,
    highestPriority && weakestFeature
      ? `Advance ${highestPriority.name}: complete one task inside ${weakestFeature.name}.`
      : undefined,
    soonestDeadline
      ? `Protect ${soonestDeadline.name}: review deadline scope for ${soonestDeadline.deadline}.`
      : undefined,
    slowestHealthyProject
      ? `Use spare focus on ${slowestHealthyProject.name}: health is stable, but velocity is only ${slowestHealthyProject.velocity.toFixed(1)}.`
      : undefined
  ].filter(Boolean) as string[];

  return moves.slice(0, 3);
}

function buildReport(
  data: MissionData,
  averageProgress: number,
  averageHealth: number,
  totalBlocked: number,
  actionPlan: string[]
) {
  return [
    "# Nexus Local Report",
    "",
    `Generated: ${new Date().toLocaleString()}`,
    `Average progress: ${averageProgress}%`,
    `Average health: ${averageHealth}/100`,
    `Blocked tasks: ${totalBlocked}`,
    "",
    "## Next Moves",
    "",
    ...actionPlan.map((move, index) => `${index + 1}. ${move}`),
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
