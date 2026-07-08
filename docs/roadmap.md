# Nexus Roadmap

## Phase 1: Core Spine

- Status: complete for the current release.
- Email auth and JWT sessions.
- Projects, features, tasks, subtasks, milestones.
- Progress calculation from task to feature to project.
- Mission Control dashboard.
- Activity log.
- Basic analytics and health score.

Auth, CRUD persistence contracts, progress rollups, and the primary workspace UI are in place.

## Phase 2: Cinematic AI Operating System

- Status: complete for the current zero-cost local-first release.
- Phase 1 completion track continues inside this phase.
- Galaxy View as the primary spatial overview.
- Time Tunnel for milestone/task chronology.
- 3D Time Tunnel with scroll/step navigation, risk scan, and forecast modes.
- City Builder for project health and completion (interactive first version complete).
- Textured star/planet/moon Galaxy hierarchy with distance-safe rendering.
- Smooth transitions between 3D exploration and 2D editing.
- Local/free daily briefing.
- Rule-based suggested next task.
- Delay detection from deadlines, task state, and velocity.
- Bottleneck detection from blockers and dependencies.
- Project summaries and weekly reviews generated from stored project data.
- Report generation using local templates first.
- Selected-project City Builder with project sidebar, feature districts, roads, towers, and
  blocker damage beacons.

## Phase 3: Free Integrations

- Status: complete for the current zero-cost local-first release.
- GitHub commit activity adapter and UI are complete.
- GitHub Pages and Netlify deployment configurations are complete.
- GitHub Pages requires one repository-owner enablement action before the first deployment.
- GitHub issues/PR activity is represented in the free integration cockpit and ready for public
  REST expansion.
- Google Calendar deadlines export as a local `.ics` file.
- Google Drive attachments use a local manifest export for manual/free upload.
- Notion import/export uses Markdown export.
- Slack and Discord notifications use local briefing templates for manual/free posting.
- All integrations must use free tiers, local exports, or user-owned credentials.

## Phase 4: SaaS Foundation

- Status: started in parallel at the user's request.
- Signup, login, logout, JWT browser session, and PostgreSQL account/workspace creation foundation.
- Firebase Google identity adapter and Firebase Hosting deployment.
- Authenticated project/feature/task persistence with strict workspace filters.
- Tenant-scoped milestone Calendar, scored Ideas, and project Journal persistence.
- Functional account Profile and persistent Settings.
- Workspace invitations.
- Roles and permissions.
- Authenticated PostgreSQL CRUD and strict workspace tenant filtering.
- Usage limits.
- Billing-ready plans.
- Admin analytics.
- Production observability.

## Phase 5: Secure Launch

- Status: started in parallel.
- Full-name and password policy enforcement.
- JWT issuer, audience, expiry, type, and membership validation.
- Verified Firebase token exchange into Nexus workspace sessions.
- Request throttling, mutation audit events, and automated dependency updates.
- Strict API headers, no-store auth responses, request-size limits, and production secret checks.
- Desktop-first production UX with mobile companion workflows.
- End-to-end authentication and tenant-isolation tests.
- Rate limiting, email verification, password reset, and audit events.
- Backups, restore drills, dependency scanning, and security review.
- Free-tier frontend, API, and PostgreSQL deployment with documented limits.
- Exchange Google/Firebase identity tokens for tenant-scoped Nexus API sessions.
- Public beta readiness and incident response runbook.

## Permanent Constraint: Zero Cost

Nexus must cost `0` from Phase 1 through the final phase while it is being built for personal use.

- Prefer open-source libraries, free tiers, local processing, and self-hosted services.
- Do not require paid APIs, paid hosting, paid databases, paid vector stores, or paid asset services.
- AI starts with deterministic heuristics, templates, and optional local models.
- Cloud AI providers can exist only as disabled adapters that require user-supplied keys.
- SaaS monetization code can be designed later, but development and personal usage stay free.
- Any feature that cannot run for free must be optional and off by default.
