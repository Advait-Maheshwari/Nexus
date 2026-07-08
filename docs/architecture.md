# Nexus Architecture

## North Star

Nexus should feel cinematic, but its architecture should remain boring where it matters. Project data, permissions, analytics, and AI jobs live in explicit services and schemas. The frontend renders that same data as dashboards, galaxies, time tunnels, city builders, and calendars.

## Cost Principle

Nexus has a hard zero-cost constraint from Phase 1 through the final personal-use phase. Architecture decisions should prefer local-first features, open-source packages, free tiers, and self-hostable services. Paid APIs and hosted services may be represented as future adapters, but they must be disabled by default and never be required for core functionality.

## System Shape

```txt
User
  Workspace
    Project
      Feature
        Task
          Subtask
      Milestone
      Idea
      JournalEntry
      TimeEntry
      Attachment
      ActivityLog
      AIInsight
```

`workspace_id` exists from the beginning so personal use can become team SaaS later.

## Backend Modules

- `auth`: JWT auth, OAuth providers later.
- `workspaces`: tenant boundary and membership.
- `projects`: project lifecycle and health.
- `features`: feature-level planning.
- `tasks`: tasks, subtasks, priorities, dependencies, states.
- `milestones`: deadline and release markers.
- `ideas`: idea capture and conversion.
- `journal`: project-linked writing and retrospectives.
- `time_tracking`: manual and future automated tracking.
- `analytics`: progress, velocity, burndown, health, productivity.
- `ai`: provider-agnostic AI orchestration.
- `integrations`: GitHub, Google Calendar, Drive, Notion, Slack, Discord.
- `activity`: append-only audit/event log.

## Frontend Modules

- `MissionControl`: primary work surface.
- `GalaxyView`: projects as stars, features as planets, tasks as moons.
- `TimeTunnel`: milestones/tasks as a cinematic time corridor with risk and forecast modes.
- `CityBuilder`: project health and completion as living city state.
- `Analytics`: dense 2D analysis for clarity.
- `Calendar`: deadline and time view.

The 3D modules consume domain DTOs. They should not calculate core business logic.

## AI Boundary

AI features call a stable service interface:

```txt
AIPlanner
  suggest_next_task(project)
  estimate_completion(project)
  detect_bottlenecks(project)
  summarize_project(project)
  generate_daily_briefing(user)
  generate_weekly_review(user)
```

The default implementation is local and free: heuristics, templates, scoring formulas, and eventually optional local models. Provider-specific code is hidden behind adapters so OpenAI, Claude, Gemini, and future local models are swappable, but paid providers stay optional and require user-supplied keys.

## Combined Phase 2 + 3 Strategy

Cinematic views and AI should be developed together because they share the same analytics signals:

- Galaxy brightness reflects progress, health, and priority.
- Time Tunnel checkpoints reflect milestones, tasks, delays, and AI risk flags.
- City growth reflects completion, blockers, velocity, and health.
- AI briefings explain what the 3D scenes are visually signaling.

This keeps the product feeling alive while preserving a single source of truth in the backend analytics layer.

## SaaS-Readiness Decisions

- Every user-owned entity has `workspace_id`.
- Every major entity supports soft archival.
- Activity is append-only.
- Analytics are computed through services, not frontend math.
- AI outputs are persisted with provenance.
- OAuth and billing can be added around the workspace boundary.
