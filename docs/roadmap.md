# Nexus Roadmap

## Phase 1: Core Spine

- Status: foundation complete, product implementation still in progress.
- Email auth and JWT sessions.
- Projects, features, tasks, subtasks, milestones.
- Progress calculation from task to feature to project.
- Mission Control dashboard.
- Activity log.
- Basic analytics and health score.

Phase 1 is not considered fully complete until auth and real CRUD persistence are wired through both UI and PostgreSQL-backed API. The scaffold, domain model, dashboard shell, analytics foundation, activity concept, health scoring, local auth endpoints, local CRUD APIs, and API-first frontend loading are in place. Remaining Phase 1 work is now part of the Phase 2 execution track.

## Phase 2: Cinematic AI Operating System

- Status: started.
- Phase 1 completion track continues inside this phase.
- Galaxy View as the primary spatial overview.
- DNA Timeline for milestone/task chronology.
- City Builder for project health and completion.
- Smooth transitions between 3D exploration and 2D editing.
- Local/free daily briefing.
- Rule-based suggested next task.
- Delay detection from deadlines, task state, and velocity.
- Bottleneck detection from blockers and dependencies.
- Project summaries and weekly reviews generated from stored project data.
- Report generation using local templates first.

## Phase 3: Free Integrations

- Status: started.
- GitHub commit activity adapter and UI are complete.
- GitHub Pages and Netlify deployment configurations are complete.
- GitHub Pages requires one repository-owner enablement action before the first deployment.
- GitHub issues/PR activity.
- Google Calendar deadlines.
- Google Drive attachments.
- Notion import/export.
- Slack and Discord notifications.
- All integrations must use free tiers, local exports, or user-owned credentials.

## Phase 4: SaaS Foundation

- Status: started in parallel at the user's request.
- Signup, login, logout, JWT browser session, and PostgreSQL account/workspace creation foundation.
- Workspace invitations.
- Roles and permissions.
- Authenticated PostgreSQL CRUD and strict workspace tenant filtering.
- Usage limits.
- Billing-ready plans.
- Admin analytics.
- Production observability.

## Phase 5: Secure Launch

- Desktop-first production UX with mobile companion workflows.
- End-to-end authentication and tenant-isolation tests.
- Rate limiting, email verification, password reset, and audit events.
- Backups, restore drills, dependency scanning, and security review.
- Free-tier frontend, API, and PostgreSQL deployment with documented limits.
- Public beta readiness and incident response runbook.

## Permanent Constraint: Zero Cost

Nexus must cost `0` from Phase 1 through the final phase while it is being built for personal use.

- Prefer open-source libraries, free tiers, local processing, and self-hosted services.
- Do not require paid APIs, paid hosting, paid databases, paid vector stores, or paid asset services.
- AI starts with deterministic heuristics, templates, and optional local models.
- Cloud AI providers can exist only as disabled adapters that require user-supplied keys.
- SaaS monetization code can be designed later, but development and personal usage stay free.
- Any feature that cannot run for free must be optional and off by default.
